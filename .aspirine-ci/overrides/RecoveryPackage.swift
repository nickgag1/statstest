import CryptoKit
import Foundation
import SwiftUI
import UniformTypeIdentifiers

extension UTType {
    static let aspirineRecovery = UTType(exportedAs: "app.aspirine.recovery", conformingTo: .data)
}

struct RecoveryItem: Codable, Identifiable, Hashable {
    let id: String
    let displayName: String
    let systemPath: String
    let sha256: String
    let data: Data
}

struct RecoveryPackage: Codable, Hashable {
    let formatVersion: Int
    let createdAt: Date
    let device: DeviceGuard.Snapshot
    let deviceBinding: String
    let appVersion: String
    let items: [RecoveryItem]

    static let currentFormatVersion = 3
    static let mobileGestaltID = "mobileGestalt"
    static let mobileGestaltPath = "systemgroup.com.apple.mobilegestaltcache/Library/Caches/com.apple.MobileGestalt.plist"

    static func decode(_ data: Data) throws -> RecoveryPackage {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let package = try decoder.decode(RecoveryPackage.self, from: data)
        try package.validate()
        return package
    }

    func encoded() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(self)
    }

    func validate() throws {
        guard formatVersion == Self.currentFormatVersion else {
            throw AspirineError.invalidRecovery("unsupported format version \(formatVersion)")
        }
        guard device.machine == DeviceGuard.supportedDevice,
              device.version == DeviceGuard.supportedVersion,
              device.build == DeviceGuard.supportedBuild else {
            throw AspirineError.invalidRecovery("package belongs to \(device.machine) / \(device.version) / \(device.build)")
        }
        guard !items.isEmpty else { throw AspirineError.invalidRecovery("package contains no system baselines") }

        let ids = items.map(\.id)
        guard Set(ids).count == ids.count else {
            throw AspirineError.invalidRecovery("duplicate recovery item IDs")
        }

        let allowedIDs = Set([Self.mobileGestaltID] + SystemTargets.allFileTargets.map(\.id))
        guard Set(ids).isSubset(of: allowedIDs) else {
            let unknown = Set(ids).subtracting(allowedIDs).sorted().joined(separator: ", ")
            throw AspirineError.invalidRecovery("unknown recovery item IDs: \(unknown)")
        }

        guard let mg = items.first(where: { $0.id == Self.mobileGestaltID }) else {
            throw AspirineError.invalidRecovery("MobileGestalt baseline is mandatory")
        }
        guard mg.systemPath == Self.mobileGestaltPath else {
            throw AspirineError.invalidRecovery("unexpected MobileGestalt path")
        }

        for item in items {
            guard item.sha256 == Self.sha256(item.data) else {
                throw AspirineError.invalidRecovery("SHA-256 mismatch for \(item.displayName)")
            }
            _ = try PlistTools.decode(item.data)
            if item.id != Self.mobileGestaltID {
                guard let target = SystemTargets.byID[item.id], target.path == item.systemPath else {
                    throw AspirineError.invalidRecovery("unexpected target path for \(item.id)")
                }
            }
        }

        guard deviceBinding == (try Self.binding(forMobileGestalt: mg.data, device: device)) else {
            throw AspirineError.invalidRecovery("device-binding hash does not match embedded MobileGestalt baseline")
        }
    }

    func validateAgainstCurrentDevice() throws {
        try DeviceGuard.enforceExactTarget()
        let current = try SystemPlistAccess.readMobileGestalt()
        let currentBinding = try Self.binding(forMobileGestalt: current, device: DeviceGuard.snapshot())
        guard currentBinding == deviceBinding else {
            throw AspirineError.invalidRecovery("this package is bound to a different iPhone/cache identity")
        }
    }

    static func binding(forMobileGestalt data: Data, device: DeviceGuard.Snapshot) throws -> String {
        let plist = try PlistTools.decode(data)
        let cache = plist["CacheExtra"] as? [String: Any]
        let uniqueDeviceID = cache?["re6Zb+zwFKJNlkQTUeT+/w"] as? String
        let cacheUUID = plist["CacheUUID"] as? String
        guard uniqueDeviceID != nil || cacheUUID != nil else {
            throw AspirineError.invalidRecovery("MobileGestalt lacks stable binding material")
        }
        let material = [device.machine, device.version, device.build, uniqueDeviceID ?? "", cacheUUID ?? ""]
            .joined(separator: "|")
        return sha256(Data(material.utf8))
    }

    static func sha256(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}

struct RecoveryDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.aspirineRecovery] }
    var data: Data

    init(data: Data) { self.data = data }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw AspirineError.invalidRecovery("empty document")
        }
        self.data = data
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

enum RecoveryStore {
    private static var root: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let directory = base.appendingPathComponent("AspirineUltimate", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    static var frozenPackageURL: URL { root.appendingPathComponent("frozen-baseline.aspirinerecovery") }

    static func captureOrLoadFrozen() throws -> RecoveryPackage {
        if FileManager.default.fileExists(atPath: frozenPackageURL.path) {
            let package = try RecoveryPackage.decode(Data(contentsOf: frozenPackageURL))
            try package.validateAgainstCurrentDevice()
            return package
        }

        try DeviceGuard.enforceExactTarget()
        var items: [RecoveryItem] = []

        let mg = try SystemPlistAccess.readMobileGestalt()
        let mgPlist = try PlistTools.decode(mg)
        if let issue = TargetProfile.recoveryBaselineIssue(mgPlist) {
            throw AspirineError.unsafeBaseline(issue)
        }

        items.append(.init(
            id: RecoveryPackage.mobileGestaltID,
            displayName: "MobileGestalt",
            systemPath: RecoveryPackage.mobileGestaltPath,
            sha256: RecoveryPackage.sha256(mg),
            data: mg
        ))

        for target in SystemTargets.allFileTargets {
            guard let data = SystemPlistAccess.readIfReachable(target) else { continue }
            items.append(.init(
                id: target.id,
                displayName: target.displayName,
                systemPath: target.path,
                sha256: RecoveryPackage.sha256(data),
                data: data
            ))
        }

        let snapshot = DeviceGuard.snapshot()
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "2.2.0"
        let package = RecoveryPackage(
            formatVersion: RecoveryPackage.currentFormatVersion,
            createdAt: Date(),
            device: snapshot,
            deviceBinding: try RecoveryPackage.binding(forMobileGestalt: mg, device: snapshot),
            appVersion: version,
            items: items
        )
        try package.validate()
        try package.encoded().write(to: frozenPackageURL, options: .atomic)
        return package
    }

    static func frozenPackage() throws -> RecoveryPackage {
        guard FileManager.default.fileExists(atPath: frozenPackageURL.path) else {
            throw AspirineError.noBaseline("recovery package")
        }
        let package = try RecoveryPackage.decode(Data(contentsOf: frozenPackageURL))
        try package.validateAgainstCurrentDevice()
        return package
    }

    static func replaceFrozen(with externalData: Data) throws -> RecoveryPackage {
        let package = try RecoveryPackage.decode(externalData)
        try package.validateAgainstCurrentDevice()
        try package.encoded().write(to: frozenPackageURL, options: .atomic)
        return package
    }

    static func item(id: String, in package: RecoveryPackage) throws -> RecoveryItem {
        guard let item = package.items.first(where: { $0.id == id }) else {
            throw AspirineError.noBaseline(id)
        }
        return item
    }

    struct RestoreSummary {
        var restored: [String] = []
        var failed: [String] = []
        var skipped: [String] = []
        var isComplete: Bool { failed.isEmpty && skipped.isEmpty }
    }

    static func restore(_ package: RecoveryPackage, logger: (String) -> Void) throws -> RestoreSummary {
        try package.validate()
        try package.validateAgainstCurrentDevice()
        var summary = RestoreSummary()

        if let mg = package.items.first(where: { $0.id == RecoveryPackage.mobileGestaltID }) {
            do {
                try SystemPlistAccess.writeMobileGestaltAndVerify(mg.data)
                summary.restored.append("MobileGestalt")
                logger("Restored MobileGestalt and verified read-back.")
            } catch {
                summary.failed.append("MobileGestalt: \(error.localizedDescription)")
                logger("FAILED MobileGestalt restore: \(error.localizedDescription)")
            }
        } else {
            summary.failed.append("MobileGestalt baseline missing")
        }

        for target in SystemTargets.allFileTargets {
            guard let item = package.items.first(where: { $0.id == target.id }) else { continue }
            let probe = SystemPlistAccess.probe(target)
            guard probe.writable else {
                let message = "\(target.displayName): target is no longer writable"
                summary.skipped.append(message)
                logger("SKIPPED \(message).")
                continue
            }
            do {
                try SystemPlistAccess.writeAndVerify(item.data, to: target)
                summary.restored.append(target.displayName)
                logger("Restored \(target.displayName).")
            } catch {
                summary.failed.append("\(target.displayName): \(error.localizedDescription)")
                logger("FAILED \(target.displayName): \(error.localizedDescription)")
            }
        }
        return summary
    }
}
