import SwiftUI
import sharedKit

struct ContentView: View {
    let calculator = SmokingCalculator.shared

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "flame.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)

            Text("tabak++")
                .font(.custom("Courier", size: 34))
                .fontWeight(.black)

            Text("Ready to track on iOS")
                .font(.caption)
                .opacity(0.6)

            Divider()

            // Example of using shared logic
            let limit = calculator.getTotalLimit(configs: [])
            Text("Daily Goal: \(limit)")
                .font(.system(.body, design: .monospaced))
        }
        .padding()
    }
}
