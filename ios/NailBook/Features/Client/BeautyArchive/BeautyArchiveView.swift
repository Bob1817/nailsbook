import SwiftUI
import PhotosUI

// MARK: - Beauty Archive View

struct BeautyArchiveView: View {
    @State private var records: [BeautyRecord] = []
    @State private var summary: BeautySummary?
    @State private var isLoading = true
    @State private var error: String?

    // Filters
    @State private var selectedYear: String?
    @State private var selectedStyle: String?
    @State private var selectedTechnician: String?

    var body: some View {
        List {
            // Summary section
            if let summary = summary {
                Section {
                    summaryCard(summary)
                }
            }

            // Filters
            Section {
                if !yearOptions.isEmpty {
                    Picker("年份", selection: $selectedYear) {
                        Text("全部年份").tag(nil as String?)
                        ForEach(yearOptions, id: \.self) { year in
                            Text(year).tag(year as String?)
                        }
                    }
                }

                if !styleOptions.isEmpty {
                    Picker("风格", selection: $selectedStyle) {
                        Text("全部风格").tag(nil as String?)
                        ForEach(styleOptions, id: \.self) { style in
                            Text(style).tag(style as String?)
                        }
                    }
                }

                if !technicianOptions.isEmpty {
                    Picker("美甲师", selection: $selectedTechnician) {
                        Text("全部美甲师").tag(nil as String?)
                        ForEach(technicianOptions, id: \.self) { tech in
                            Text(tech).tag(tech as String?)
                        }
                    }
                }
            }

            // Records
            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if filteredRecords.isEmpty {
                NBEmptyState(icon: "sparkles", title: "暂无美甲记录")
            } else {
                ForEach(filteredRecords) { record in
                    RecordRow(record: record)
                }
            }
        }
        .navigationTitle("美甲档案")
        .task { await loadRecords() }
        .refreshable { await loadRecords() }
    }

    // MARK: - Summary Card

    private func summaryCard(_ summary: BeautySummary) -> some View {
        VStack(spacing: Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("总消费")
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextSecondary)
                    Text(formatMoney(summary.totalSpent ?? 0))
                        .font(NBFont.titleLarge)
                        .fontWeight(.bold)
                        .foregroundColor(.nbPrimary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: Spacing.xs) {
                    Text("最爱风格")
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextSecondary)
                    Text(summary.favoriteStyle ?? "待探索")
                        .font(NBFont.bodyLarge)
                        .fontWeight(.medium)
                        .foregroundColor(.nbTextPrimary)
                }
            }

            if let tags = summary.styleTags, !tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        ForEach(tags, id: \.self) { tag in
                            Text("#\(tag)")
                                .font(NBFont.captionMedium)
                                .foregroundColor(.nbPrimary)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, Spacing.xs)
                                .background(Color.nbPrimarySoft)
                                .cornerRadius(Radius.full)
                        }
                    }
                }
            }
        }
        .padding(.vertical, Spacing.sm)
    }

    // MARK: - Record Row

    private func recordRow(_ record: BeautyRecord) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(record.title ?? "私人美甲服务")
                        .font(NBFont.bodyLarge)
                        .fontWeight(.medium)
                        .foregroundColor(.nbTextPrimary)
                    Text(record.technicianName ?? "")
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextSecondary)
                }
                Spacer()
                if let date = formatDate(record.serviceDate) {
                    Text(date)
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextTertiary)
                }
            }

            // Images
            if let images = record.imageUrls, !images.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        ForEach(images, id: \.self) { url in
                            AsyncImage(url: URL(string: url)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color.nbSecondarySoft)
                                    .overlay(ProgressView())
                            }
                            .frame(width: 80, height: 80)
                            .cornerRadius(Radius.md)
                            .clipped()
                        }
                    }
                }
            }

            // Tags
            if let tags = record.tags, !tags.isEmpty {
                HStack(spacing: Spacing.xs) {
                    ForEach(tags, id: \.self) { tag in
                        Text(tag)
                            .font(NBFont.captionSmall)
                            .foregroundColor(.nbTextTertiary)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 2)
                            .background(Color.nbSecondarySoft)
                            .cornerRadius(Radius.sm)
                    }
                }
            }

            // Price
            if let price = record.price, price > 0 {
                Text(formatMoney(price))
                    .font(NBFont.bodyMedium)
                    .fontWeight(.medium)
                    .foregroundColor(.nbPrimary)
            }

            // Note
            if let note = record.clientRecordNote, !note.isEmpty {
                Text(note)
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextSecondary)
                    .padding(.top, Spacing.xs)
            }
        }
        .padding(.vertical, Spacing.sm)
    }

    // MARK: - Computed Properties

    private var yearOptions: [String] {
        let years = records.compactMap { record -> String? in
            guard let date = record.serviceDate else { return nil }
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            guard let d = formatter.date(from: date) else { return nil }
            let calendar = Calendar.current
            return String(calendar.component(.year, from: d))
        }
        return Array(Set(years)).sorted(by: >)
    }

    private var styleOptions: [String] {
        let styles = records.flatMap { $0.tags ?? [] }
        return Array(Set(styles)).sorted()
    }

    private var technicianOptions: [String] {
        let techs = records.compactMap { $0.technicianName }
        return Array(Set(techs)).sorted()
    }

    private var filteredRecords: [BeautyRecord] {
        records.filter { record in
            if let year = selectedYear {
                guard let date = record.serviceDate else { return false }
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                guard let d = formatter.date(from: date) else { return false }
                let calendar = Calendar.current
                if String(calendar.component(.year, from: d)) != year { return false }
            }
            if let style = selectedStyle {
                guard let tags = record.tags, tags.contains(style) else { return false }
            }
            if let tech = selectedTechnician {
                guard record.technicianName == tech else { return false }
            }
            return true
        }
    }

    // MARK: - Actions

    private func loadRecords() async {
        do {
            let response: BeautyArchiveResponse = try await APIClient.shared.request(.beautyArchive)
            records = response.records ?? []
            summary = response.summary
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    private func formatDate(_ isoString: String?) -> String? {
        guard let isoString = isoString else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return nil }
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "yyyy年M月d日"
        return displayFormatter.string(from: date)
    }

    private func formatMoney(_ amount: Double) -> String {
        if amount >= 10000 {
            return String(format: "¥%.1f万", amount / 10000)
        } else {
            return String(format: "¥%.0f", amount)
        }
    }
}

// MARK: - Record Row View

struct RecordRow: View {
    let record: BeautyRecord

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(record.title ?? "私人美甲服务")
                        .font(NBFont.bodyLarge)
                        .fontWeight(.medium)
                        .foregroundColor(.nbTextPrimary)
                    Text(record.technicianName ?? "")
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextSecondary)
                }
                Spacer()
                if let date = formatDate(record.serviceDate) {
                    Text(date)
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextTertiary)
                }
            }

            // Images
            if let images = record.imageUrls, !images.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        ForEach(images, id: \.self) { url in
                            AsyncImage(url: URL(string: url)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color.nbSecondarySoft)
                                    .overlay(ProgressView())
                            }
                            .frame(width: 80, height: 80)
                            .cornerRadius(Radius.md)
                            .clipped()
                        }
                    }
                }
            }

            // Tags
            if let tags = record.tags, !tags.isEmpty {
                HStack(spacing: Spacing.xs) {
                    ForEach(tags, id: \.self) { tag in
                        Text(tag)
                            .font(NBFont.captionSmall)
                            .foregroundColor(.nbTextTertiary)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 2)
                            .background(Color.nbSecondarySoft)
                            .cornerRadius(Radius.sm)
                    }
                }
            }

            // Price
            if let price = record.price, price > 0 {
                Text(formatMoney(price))
                    .font(NBFont.bodyMedium)
                    .fontWeight(.medium)
                    .foregroundColor(.nbPrimary)
            }

            // Note
            if let note = record.clientRecordNote, !note.isEmpty {
                Text(note)
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextSecondary)
                    .padding(.top, Spacing.xs)
            }
        }
        .padding(.vertical, Spacing.sm)
    }

    private func formatDate(_ isoString: String?) -> String? {
        guard let isoString = isoString else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return nil }
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "yyyy年M月d日"
        return displayFormatter.string(from: date)
    }

    private func formatMoney(_ amount: Double) -> String {
        if amount >= 10000 {
            return String(format: "¥%.1f万", amount / 10000)
        } else {
            return String(format: "¥%.0f", amount)
        }
    }
}
