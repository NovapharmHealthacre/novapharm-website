// Nova ML hard-concrete reference math (Louizos et al., ICLR 2018).
// Source-only, offline, nonclinical research. Not an app or approved model.
import Foundation

enum NovaL0ResearchError: Error {
    case invalidGateParameters
    case invalidFeatureSchema
    case invalidNumericalInput
}

@available(iOS 17.0, macOS 14.0, *)
struct NovaL0ResearchMath {
    static func sigmoid(_ value: Double) -> Double {
        if value >= 0 { return 1 / (1 + exp(-value)) }
        let scaled = exp(value)
        return scaled / (1 + scaled)
    }

    static func validate(temperature: Double, gamma: Double, zeta: Double) throws {
        guard temperature.isFinite && gamma.isFinite && zeta.isFinite &&
              temperature > 0 && gamma < 0 && zeta > 1 else {
            throw NovaL0ResearchError.invalidGateParameters
        }
    }

    static func activationProbability(
        logAlpha: Double, temperature: Double = 2.0 / 3.0,
        gamma: Double = -0.1, zeta: Double = 1.1
    ) throws -> Double {
        try validate(temperature: temperature, gamma: gamma, zeta: zeta)
        guard logAlpha.isFinite else { throw NovaL0ResearchError.invalidNumericalInput }
        return sigmoid(logAlpha - temperature * log(-gamma / zeta))
    }

    static func deterministicGate(
        logAlpha: Double, temperature: Double = 2.0 / 3.0,
        gamma: Double = -0.1, zeta: Double = 1.1
    ) throws -> Double {
        try validate(temperature: temperature, gamma: gamma, zeta: zeta)
        guard logAlpha.isFinite else { throw NovaL0ResearchError.invalidNumericalInput }
        return min(1, max(0, sigmoid(logAlpha) * (zeta - gamma) + gamma))
    }

    static func sampleGate(
        logAlpha: Double, uniform: Double, temperature: Double = 2.0 / 3.0,
        gamma: Double = -0.1, zeta: Double = 1.1
    ) throws -> Double {
        try validate(temperature: temperature, gamma: gamma, zeta: zeta)
        guard logAlpha.isFinite && uniform.isFinite && uniform > 0 && uniform < 1 else {
            throw NovaL0ResearchError.invalidNumericalInput
        }
        let logisticNoise = log(uniform) - log1p(-uniform)
        return min(1, max(0, sigmoid((logisticNoise + logAlpha) / temperature) * (zeta - gamma) + gamma))
    }
}


@available(iOS 17.0, macOS 14.0, *)
struct NovaL0ResearchCandidate {
    let format: String
    let releaseStatus: String
    let productionApproved: Bool
    let customerVisible: Bool
    let featureNames: [String]
    let coefficients: [Double]
    let bias: Double
    let nonZeroCount: Int

    // Deliberately not an approved Core ML runtime. This scores only an explicitly
    // supplied synthetic research candidate and never opens files or networks.
    func score(features: [String: Double]) throws -> Double {
        guard format == "nova-l0-sparse-linear-candidate-v1" &&
              releaseStatus == "research-only" &&
              !productionApproved && !customerVisible &&
              !featureNames.isEmpty && featureNames.count <= 4096 &&
              featureNames.count == coefficients.count &&
              featureNames.count == Set(featureNames).count &&
              featureNames.allSatisfy({ $0.range(of: "^[a-z][a-z0-9_]{0,63}$", options: .regularExpression) != nil }) &&
              Set(features.keys) == Set(featureNames) &&
              coefficients.allSatisfy({ $0.isFinite }) &&
              coefficients.filter({ $0 != 0 }).count == nonZeroCount else {
            throw NovaL0ResearchError.invalidFeatureSchema
        }
        guard bias.isFinite && features.values.allSatisfy({ $0.isFinite }) else {
            throw NovaL0ResearchError.invalidNumericalInput
        }
        var result = bias
        for index in featureNames.indices {
            guard let value = features[featureNames[index]] else {
                throw NovaL0ResearchError.invalidFeatureSchema
            }
            result += value * coefficients[index]
            if !result.isFinite { throw NovaL0ResearchError.invalidNumericalInput }
        }
        return result
    }
}

// Native inference still belongs in NovaCoreMLRuntime, after signed manifest,
// licence, model-schema, privacy, rights and independent validation checks.
// This helper does not load a model, process medicine data, or publish predictions.
