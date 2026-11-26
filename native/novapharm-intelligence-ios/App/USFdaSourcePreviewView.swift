import SwiftUI

/// Offline US FDA source catalogue; never performs a medical data request.
struct NovaFDASourcePreviewView: View {
    var body: some View {
        List {
            Section("Private source preview") {
                Text("No mobile sign-in or FDA record access is enabled. These are five source types, not live approval, safety or recall results.")
                    .font(.body)
                Text("A signed native app, dedicated OIDC/PKCE session, board authorization, source rights and independent release acceptance are required.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Section("United States FDA") {
                ForEach(NovaFDAMobileReadiness.sources) { source in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(source.title).font(.headline)
                        Text(source.caution).font(.subheadline).foregroundStyle(.secondary)
                        Text("Not connected on iOS").font(.caption).foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 5)
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier("novapharm.fda.source.\(source.id)")
                }
            }
        }
        .navigationTitle("US FDA sources")
        .accessibilityIdentifier("novapharm.fda.offline-sources")
    }
}
