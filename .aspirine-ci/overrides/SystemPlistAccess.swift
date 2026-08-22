import Darwin
import Foundation

struct SystemPlistTarget: Identifiable, Hashable, Codable {
    let id: String
    let displayName: String
    let directory: String
    let filename: String
    var path: String { directory + "/" + filename }
}

enum SystemTargets {
    static let systemGroupEligibility = SystemPlistTarget(
        id: "eligibility-systemgroup",
        displayName: "Eligibility SystemGroup",
        directory: "/var/containers/Shared/SystemGroup/systemgroup.com.apple.eligibility",
        filename: "eligibility.plist"
    )

    static let eligibilitydStore = SystemPlistTarget(
        id: "eligibilityd-store",
        displayName: "eligibilityd public store",
        directory: "/private/var/db/eligibilityd",
        filename: "eligibility.plist"
    )

    static let osEligibilityStore = SystemPlistTarget(
        id: "os-eligibility-store",
        displayName: "os_eligibility answer store",
        directory: "/private/var/db/os_eligibility",
        filename: "eligibility.plist"
    )

    static let featureFlags = SystemPlistTarget(
        id: "feature-flags",
        displayName: "FeatureFlags Global",
        directory: "/var/preferences/FeatureFlags",
        filename: "Global.plist"
    )

    static let eligibilityStores = [systemGroupEligibility, eligibilitydStore, osEligibilityStore]
    static let allFileTargets = eligibilityStores + [featureFlags]
    static var byID: [String: SystemPlistTarget] {
        Dictionary(uniqueKeysWithValues: allFileTargets.map { ($0.id, $0) })
    }
}

enum SystemPlistAccess {
    static func probe(_ target: SystemPlistTarget) -> AccessProbeResult {
        SandboxAccess.probe(directory: target.directory, filePath: target.path)
    }

    static func read(_ target: SystemPlistTarget) throws -> Data {
        let handle = try SandboxAccess.consume(target.directory, create: true)
        defer { handle.release() }
        do {
            return try Data(contentsOf: URL(fileURLWithPath: target.path))
        } catch {
            throw AspirineError.targetUnavailable("\(target.displayName): \(error.localizedDescription)")
        }
    }

    static func readIfReachable(_ target: SystemPlistTarget) -> Data? {
        try? read(target)
    }

    static func writeAndVerify(_ data: Data, to target: SystemPlistTarget) throws {
        _ = try PlistTools.decode(data)
        let handle = try SandboxAccess.consume(target.directory, create: true)
        defer { handle.release() }
        let url = URL(fileURLWithPath: target.path)
        try writeBestAvailable(data, to: url, label: target.displayName)
        guard let readback = try? Data(contentsOf: url), readback == data else {
            throw AspirineError.verificationFailed("\(target.displayName) byte read-back")
        }
    }

    static func writeEligibilityAndVerify(_ patch: EligibilityPatcher.Result, to target: SystemPlistTarget) throws {
        _ = try PlistTools.decode(patch.data)
        let handle = try SandboxAccess.consume(target.directory, create: true)
        defer { handle.release() }
        let url = URL(fileURLWithPath: target.path)
        try writeBestAvailable(patch.data, to: url, label: target.displayName)
        guard let readback = try? Data(contentsOf: url) else {
            throw AspirineError.verificationFailed("\(target.displayName) could not be read after eligibility write")
        }
        _ = try PlistTools.decode(readback)
        for domain in patch.touchedDomains {
            guard EligibilityPatcher.answer(for: domain, in: readback) == 4 else {
                throw AspirineError.verificationFailed("\(target.displayName) did not retain eligible answer for \(domain)")
            }
        }
    }

    static func readMobileGestalt() throws -> Data {
        let access = AspirineMobileGestaltAccess()
        do {
            try access.activate()
        } catch {
            access.deactivate()
            throw AspirineError.mobileGestaltUnavailable
        }
        guard let path = access.mobileGestaltPath else {
            access.deactivate()
            throw AspirineError.mobileGestaltUnavailable
        }
        defer { access.deactivate() }
        return try Data(contentsOf: URL(fileURLWithPath: path))
    }

    static func writeMobileGestaltAndVerify(_ data: Data) throws {
        _ = try PlistTools.decode(data)
        let access = AspirineMobileGestaltAccess()
        do {
            try access.activate()
        } catch {
            access.deactivate()
            throw AspirineError.mobileGestaltUnavailable
        }
        guard let path = access.mobileGestaltPath else {
            access.deactivate()
            throw AspirineError.mobileGestaltUnavailable
        }
        defer { access.deactivate() }
        let url = URL(fileURLWithPath: path)
        try writeBestAvailable(data, to: url, label: "MobileGestalt")
        guard let readback = try? Data(contentsOf: url), readback == data else {
            throw AspirineError.verificationFailed("MobileGestalt byte read-back")
        }
    }

    static func probeMobileGestalt() -> AccessProbeResult {
        let access = AspirineMobileGestaltAccess()
        do {
            try access.activate()
        } catch {
            access.deactivate()
            return .init(readable: false, writable: false, detail: error.localizedDescription)
        }
        guard let path = access.mobileGestaltPath else {
            access.deactivate()
            return .init(readable: false, writable: false, detail: "MobileGestalt extension returned no path")
        }
        defer { access.deactivate() }

        let readFD = Darwin.open(path, O_RDONLY)
        let readable = readFD >= 0
        if readFD >= 0 { Darwin.close(readFD) }

        let writeFD = Darwin.open(path, O_WRONLY)
        let writable = writeFD >= 0
        if writeFD >= 0 { Darwin.close(writeFD) }

        if readable, let data = try? Data(contentsOf: URL(fileURLWithPath: path)), (try? PlistTools.decode(data)) != nil {
            return .init(readable: true, writable: writable, detail: "ContainerManager object extension active; file open R=true W=\(writable)")
        }
        return .init(readable: false, writable: writable, detail: "Extension active but MobileGestalt could not be decoded")
    }

    private static func writeBestAvailable(_ data: Data, to url: URL, label: String) throws {
        do {
            try data.write(to: url, options: [.atomic])
            return
        } catch {
        }

        do {
            try data.write(to: url, options: [])
        } catch {
            throw AspirineError.writeFailed("\(label): \(error.localizedDescription)")
        }
    }
}
