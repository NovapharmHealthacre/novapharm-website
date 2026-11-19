// NovaPharm native iOS/macOS research component — not an Expo bridge or signed app.
// No user-location permission, background tracking or unapproved pharma data reads.
import CoreLocation
import MapKit
import SwiftUI

public struct NovaMappedSite: Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let latitude: Double
    public let longitude: Double

    /// Source admission and tenancy must be checked by the calling application.
    /// This initializer only validates geometry; it does not establish rights.
    public init?(id: String, title: String, latitude: Double, longitude: Double) {
        guard !id.isEmpty, !title.isEmpty,
              latitude.isFinite, longitude.isFinite,
              (-90.0...90.0).contains(latitude),
              (-180.0...180.0).contains(longitude) else { return nil }
        self.id = id
        self.title = title
        self.latitude = latitude
        self.longitude = longitude
    }

    public var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

@available(iOS 17.0, macOS 14.0, *)
public struct NovaMapKitView: View {
    private let sites: [NovaMappedSite]
    @State private var camera: MapCameraPosition = .automatic

    public init(sites: [NovaMappedSite]) {
        self.sites = sites
    }

    public var body: some View {
        Map(position: $camera) {
            ForEach(sites) { site in
                Marker(site.title, coordinate: site.coordinate)
                    .tint(Color(red: 0.89, green: 0.07, blue: 0.04))
            }
        }
        .mapStyle(.standard)
        .accessibilityLabel("Authorised site reference map")
        // No MapUserLocationButton: this is a data-map, not user tracking.
    }
}
