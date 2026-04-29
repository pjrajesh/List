import WidgetKit
import SwiftUI

// MARK: - Data Model
struct ListItem: Codable, Hashable {
    var name: String
    var emoji: String
    var checked: Bool
}

struct ListSnapshot: Codable {
    var listLabel: String
    var totalCount: Int
    var remainingCount: Int
    var items: [ListItem]
    var updatedAt: String  // ISO 8601
}

// MARK: - Storage (App Group)
enum SharedStore {
    static let suiteName = "group.com.listorix.app.shared"
    static let snapshotKey = "listorix.list_snapshot"

    static func loadSnapshot() -> ListSnapshot? {
        let defaults = UserDefaults(suiteName: suiteName)
        guard let raw = defaults?.string(forKey: snapshotKey),
              let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(ListSnapshot.self, from: data)
    }
}

// MARK: - TimelineEntry
struct ListEntry: TimelineEntry {
    let date: Date
    let snapshot: ListSnapshot
}

// MARK: - Provider
struct ListProvider: TimelineProvider {
    func placeholder(in context: Context) -> ListEntry {
        ListEntry(date: Date(), snapshot: defaultSnapshot)
    }
    func getSnapshot(in context: Context, completion: @escaping (ListEntry) -> Void) {
        let snap = SharedStore.loadSnapshot() ?? defaultSnapshot
        completion(ListEntry(date: Date(), snapshot: snap))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ListEntry>) -> Void) {
        let snap = SharedStore.loadSnapshot() ?? defaultSnapshot
        let entry = ListEntry(date: Date(), snapshot: snap)
        // Refresh every 30 minutes (the OS may decide to do so less often).
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private var defaultSnapshot: ListSnapshot {
        ListSnapshot(
            listLabel: "Your List",
            totalCount: 0,
            remainingCount: 0,
            items: [],
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )
    }
}

// MARK: - View
struct ListWidgetView: View {
    let entry: ListEntry
    @Environment(\.widgetFamily) var family

    private let bgGradient = LinearGradient(
        gradient: Gradient(colors: [Color(red: 0.12, green: 0.23, blue: 0.54), Color(red: 0.23, green: 0.36, blue: 0.73)]),
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
    private let gold = Color(red: 0.83, green: 0.66, blue: 0.29)

    var body: some View {
        ZStack {
            bgGradient
            content
                .padding(family == .systemSmall ? 12 : 14)
        }
        .containerBackground(for: .widget) { bgGradient }
        .widgetURL(URL(string: "listorix://list"))
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .systemSmall:
            smallView
        default:
            mediumView
        }
    }

    // small (2x2)
    private var smallView: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("✦ LISTORIX")
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(gold)
            Text(entry.snapshot.listLabel)
                .font(.system(size: 14, weight: .heavy))
                .foregroundColor(.white)
                .lineLimit(1)
            Spacer(minLength: 4)
            Text("\(entry.snapshot.remainingCount)")
                .font(.system(size: 48, weight: .black))
                .foregroundColor(.white)
                .padding(.bottom, -8)
            Text("items left")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.white.opacity(0.7))
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // medium (4x2)
    private var mediumView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("✦ LISTORIX")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(gold)
                    Text(entry.snapshot.listLabel)
                        .font(.system(size: 14, weight: .heavy))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                Spacer()
                Text("\(entry.snapshot.remainingCount) left")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(gold))
            }
            if entry.snapshot.items.isEmpty {
                Spacer()
                HStack { Spacer(); VStack(spacing: 2) {
                    Text("🛒 Your list is empty")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white.opacity(0.7))
                    Text("Tap to add items")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.45))
                }; Spacer() }
                Spacer()
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(Array(entry.snapshot.items.prefix(5).enumerated()), id: \.offset) { _, item in
                        HStack(spacing: 8) {
                            Text(item.emoji.isEmpty ? "🛒" : item.emoji).font(.system(size: 13))
                            Text(item.name)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(item.checked ? .white.opacity(0.45) : .white)
                                .lineLimit(1)
                            Spacer()
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Color.white.opacity(0.08)))
                    }
                }
            }
            Spacer(minLength: 0)
            HStack {
                Text(relative(from: entry.snapshot.updatedAt))
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(.white.opacity(0.45))
                Spacer()
                Link(destination: URL(string: "listorix://add")!) {
                    Text("+ Add item")
                        .font(.system(size: 11, weight: .heavy))
                        .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(gold))
                }
            }
        }
    }

    private func relative(from iso: String) -> String {
        let f = ISO8601DateFormatter()
        guard let d = f.date(from: iso) else { return "" }
        let diff = max(0, Date().timeIntervalSince(d))
        let m = Int(diff / 60)
        if m < 1 { return "Updated just now" }
        if m < 60 { return "Updated \(m)m ago" }
        let h = m / 60
        if h < 24 { return "Updated \(h)h ago" }
        return "Updated \(h / 24)d ago"
    }
}

// MARK: - Widget
@main
struct ListorixWidget: Widget {
    let kind: String = "ListorixWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ListProvider()) { entry in
            ListWidgetView(entry: entry)
        }
        .configurationDisplayName("Listorix — Your List")
        .description("See your shopping list at a glance and add items in one tap.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
