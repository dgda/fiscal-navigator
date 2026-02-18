# Treasury OS

Treasury OS is a financial roadmap and liquidity forecasting engine designed to track multi-cycle financial trajectories with precision.

## Core Features

- **Dynamic Roadmap Engine**: Visualizes financial cycles based on configurable payout archetypes (bi-weekly, semi-monthly, or monthly).
- **Liquidity Forecasting**: Real-time calculation of "Burn Days" and liquidity gaps to determine tactical runway.
- **Modern Interface**: A responsive dashboard featuring glassmorphism, theme-aware transitions, and optimized data views.
- **Cycle-Based Accounting**: Focuses on specific financial cycles and payout windows rather than generic monthly buckets.
- **Local-First Data**: Built on an Express and LowDB backend for efficient, local data persistence.

## Technical Stack

### Frontend

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Interactions**: @dnd-kit (Drag and Drop)

### Backend

- **Server**: Express
- **Database**: LowDB (Local JSON-based persistence)
- **Execution**: tsx

## Getting Started

### Prerequisites

- Node.js (Latest LTS)
- npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/dgda/fiscal-navigator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the application (Client & Server):
   ```bash
   npm run dev
   ```

## Development Scripts

- `npm run dev`: Starts the Vite dev server and the Express backend concurrently.
- `npm run build`: Compiles the source and builds the production frontend.
- `npm run lint`: Runs ESLint for code quality checks.

## Architecture

- `/src/components/`: UI components and roadmap features.
- `/src/context/`: Global state for financial data and preferences.
- `/src/hooks/`: API handling transaction persistence.

## License

This project is proprietary. For the full legal text regarding usage restrictions, commercial limitations, and intellectual property rights, please refer to the LICENSE.md file in the root directory.
