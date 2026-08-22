import Foundation

struct DomainRuntimeState: Identifiable, Equatable, Sendable {
    let name: String
    let domainID: UInt64
    let answer: Int?
    let source: Int?
    let storedAnswer: Int?
    let storedSource: Int?
    let storedResult: Int?
    let evidence: String
    var id: String { name }
    var isEligible: Bool { answer == 4 }
    var storeIsEligible: Bool { storedResult == 0 && storedAnswer == 4 }
}

struct AssetProbeSummary: Equatable, Sendable {
    let available: Bool
    let queryResult: Int
    let count: Int
    let localPathCount: Int
    let rawSummary: String
}

struct DeepProbeReport: Sendable {
    let timestamp: Date
    let device: DeviceGuard.Snapshot
    let mobileGestaltAccess: AccessProbeResult
    let fileAccess: [String: AccessProbeResult]
    let mobileGestaltFileValues: [String: String]
    let mobileGestaltRuntimeValues: [String: String]
    let recoveryBaselineIssue: String?
    let runtimeProfileMatches: Bool
    let eligibilityRuntimeAvailable: Bool
    let eligibilityStateDumpText: String
    let domains: [DomainRuntimeState]
    let assetProbe: AssetProbeSummary

    var primaryEligibility: DomainRuntimeState? {
        domains.first { $0.name == TargetProfile.primaryEligibilityDomain }
    }

    var coreEligibilityReady: Bool {
        TargetProfile.coreEligibilityDomains.allSatisfy { name in
            domains.first(where: { $0.name == name })?.isEligible == true
        }
    }

    var completionReady: Bool {
        device.exactTarget && runtimeProfileMatches && coreEligibilityReady
    }
}

enum RuntimeProbe {
    static func run() -> DeepProbeReport {
        let device = DeviceGuard.snapshot()
        let mgAccess = SystemPlistAccess.probeMobileGestalt()
        var access: [String: AccessProbeResult] = [:]
        for target in SystemTargets.allFileTargets { access[target.id] = SystemPlistAccess.probe(target) }

        let mgFileValues = mobileGestaltFileValues()
        let baselineIssue = recoveryBaselineIssue()
        let rawRuntime = ASPGetMobileGestaltAnswers(TargetProfile.runtimeKeys)
        let runtimeStrings = stringDictionary(rawRuntime)
        let runtimeProfileMatches = TargetProfile.runtimeMatches(rawRuntime)

        var eligibilityStoreHandles: [SandboxHandle] = []
        for target in [SystemTargets.osEligibilityStore, SystemTargets.eligibilitydStore] {
            if let handle = try? SandboxAccess.consume(target.directory, create: true) {
                eligibilityStoreHandles.append(handle)
            }
        }
        defer { eligibilityStoreHandles.forEach { $0.release() } }

        let eligibilityAvailable = ASPEligibilityRuntimeAvailable()
        var dump: [String: Any] = [:]
        var dumpText = "<unavailable>"
        if eligibilityAvailable {
            let value = ASPGetEligibilityStateDump()
            dump = value
            dumpText = pretty(value)
        }

        let domains = TargetProfile.eligibilityDomains.map { name -> DomainRuntimeState in
            let id = ASPEligibilityDomainID(name)
            let evidence = EligibilityStateInterpreter.find(name: name, domainID: id, in: dump)
            let stored = ASPGetEligibilityDomainAnswer(name)
            return .init(
                name: name,
                domainID: id,
                answer: evidence.answer,
                source: evidence.source,
                storedAnswer: (stored["answer"] as? NSNumber)?.intValue,
                storedSource: (stored["source"] as? NSNumber)?.intValue,
                storedResult: (stored["result"] as? NSNumber)?.intValue,
                evidence: evidence.evidence
            )
        }

        let assets = ASPGetGenerativeModelsAssetProbe()
        let assetSummary = AssetProbeSummary(
            available: (assets["available"] as? NSNumber)?.boolValue ?? false,
            queryResult: (assets["queryResult"] as? NSNumber)?.intValue ?? -1,
            count: (assets["count"] as? NSNumber)?.intValue ?? 0,
            localPathCount: (assets["localPathCount"] as? NSNumber)?.intValue ?? 0,
            rawSummary: pretty(assets)
        )

        return DeepProbeReport(
            timestamp: Date(),
            device: device,
            mobileGestaltAccess: mgAccess,
            fileAccess: access,
            mobileGestaltFileValues: mgFileValues,
            mobileGestaltRuntimeValues: runtimeStrings,
            recoveryBaselineIssue: baselineIssue,
            runtimeProfileMatches: runtimeProfileMatches,
            eligibilityRuntimeAvailable: eligibilityAvailable,
            eligibilityStateDumpText: dumpText,
            domains: domains,
            assetProbe: assetSummary
        )
    }

    private static func mobileGestaltFileValues() -> [String: String] {
        guard let data = try? SystemPlistAccess.readMobileGestalt(),
              let plist = try? PlistTools.decode(data),
              let cache = plist["CacheExtra"] as? [String: Any] else { return [:] }
        var result: [String: String] = [:]
        for key in TargetProfile.fileDiagnosticKeys { result[key] = describe(cache[key]) }
        return result
    }

    private static func recoveryBaselineIssue() -> String? {
        guard let data = try? SystemPlistAccess.readMobileGestalt(),
              let plist = try? PlistTools.decode(data) else {
            return "MobileGestalt could not be inspected for baseline cleanliness"
        }
        return TargetProfile.recoveryBaselineIssue(plist)
    }

    static func describe(_ value: Any?) -> String {
        guard let value, !(value is NSNull) else { return "<unset>" }
        if let data = value as? Data { return "<data \(data.count) bytes>" }
        return String(describing: value)
    }

    static func pretty(_ object: Any) -> String {
        if JSONSerialization.isValidJSONObject(object),
           let data = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]),
           let string = String(data: data, encoding: .utf8) { return string }
        return String(describing: object)
    }

    private static func stringDictionary(_ dictionary: [String: Any]) -> [String: String] {
        dictionary.mapValues { describe($0) }
    }
}

private enum EligibilityStateInterpreter {
    struct Evidence {
        let answer: Int?
        let source: Int?
        let evidence: String
    }

    static func find(name: String, domainID: UInt64, in root: Any) -> Evidence {
        if let direct = findExactKey(name: name, in: root) { return decode(value: direct, path: name) }
        if domainID != 0, let sibling = findDomainRecord(name: name, domainID: domainID, in: root) { return decode(value: sibling.value, path: sibling.path) }
        return .init(answer: nil, source: nil, evidence: "not located in eligibilityd state dump")
    }

    private static func findExactKey(name: String, in value: Any) -> Any? {
        if let dict = value as? [String: Any] {
            if let hit = dict[name] { return hit }
            for child in dict.values { if let hit = findExactKey(name: name, in: child) { return hit } }
        } else if let array = value as? [Any] {
            for child in array { if let hit = findExactKey(name: name, in: child) { return hit } }
        }
        return nil
    }

    private static func findDomainRecord(name: String, domainID: UInt64, in value: Any, path: String = "root") -> (value: Any, path: String)? {
        if let dict = value as? [String: Any] {
            let nameCandidates = ["domainName", "name", "domain_name", "domain"]
            let idCandidates = ["domainID", "domainId", "domain_id", "domain"]
            let sameName = nameCandidates.contains { (dict[$0] as? String) == name }
            let sameID = idCandidates.contains { key in
                if let n = dict[key] as? NSNumber { return n.uint64Value == domainID }
                if let s = dict[key] as? String, let n = UInt64(s) { return n == domainID }
                return false
            }
            if sameName || sameID { return (dict, path) }
            for (key, child) in dict {
                if let hit = findDomainRecord(name: name, domainID: domainID, in: child, path: path + "." + key) { return hit }
            }
        } else if let array = value as? [Any] {
            for (index, child) in array.enumerated() {
                if let hit = findDomainRecord(name: name, domainID: domainID, in: child, path: path + "[\(index)]") { return hit }
            }
        }
        return nil
    }

    private static func decode(value: Any, path: String) -> Evidence {
        if let number = value as? NSNumber {
            return .init(answer: number.intValue, source: nil, evidence: "\(path)=\(number)")
        }
        if let dict = value as? [String: Any] {
            let answerKeys = ["os_eligibility_answer_t", "answer", "answer_t", "eligibilityAnswer", "result"]
            let sourceKeys = ["os_eligibility_answer_source_t", "source", "answerSource", "source_t"]
            let answer = firstInt(keys: answerKeys, in: dict)
            let source = firstInt(keys: sourceKeys, in: dict)
            return .init(answer: answer, source: source, evidence: path + " " + RuntimeProbe.pretty(dict))
        }
        return .init(answer: nil, source: nil, evidence: "\(path)=\(String(describing: value))")
    }

    private static func firstInt(keys: [String], in dict: [String: Any]) -> Int? {
        for key in keys {
            if let n = dict[key] as? NSNumber { return n.intValue }
            if let s = dict[key] as? String, let n = Int(s) { return n }
        }
        for child in dict.values {
            if let nested = child as? [String: Any], let value = firstInt(keys: keys, in: nested) { return value }
        }
        return nil
    }
}
