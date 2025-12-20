import type { GameState } from '../types';

interface FinancesPanelProps {
  gameState: GameState;
}

export function FinancesPanel({ gameState }: FinancesPanelProps) {
  const { economy } = gameState;
  
  // Add null safety check
  if (!economy) {
    return (
      <div className="panel finances-panel">
        <h3>Finances</h3>
        <p>Loading economy data...</p>
      </div>
    );
  }

  const netProfit = economy.totalRevenue - economy.totalExpenses;
  const netIncomePerMin = economy.revenuePerMinute - economy.expensesPerMinute;

  return (
    <div className="panel finances-panel">
      <h3>💰 Finances</h3>
      
      <div className="stat-row">
        <span>Total Revenue:</span>
        <span className="positive">+${economy.totalRevenue.toFixed(2)}</span>
      </div>
      
      <div className="stat-row">
        <span>Total Expenses:</span>
        <span className="negative">-${economy.totalExpenses.toFixed(2)}</span>
      </div>
      
      <div className="stat-row">
        <span>Net Profit:</span>
        <span className={netProfit >= 0 ? 'positive' : 'negative'}>
          ${netProfit.toFixed(2)}
        </span>
      </div>
      
      <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #444' }} />
      
      <div className="stat-row">
        <span>Revenue/min:</span>
        <span className="positive">+${economy.revenuePerMinute.toFixed(2)}</span>
      </div>
      
      <div className="stat-row">
        <span>Upkeep/min:</span>
        <span className="negative">-${economy.expensesPerMinute.toFixed(2)}</span>
      </div>
      
      <div className="stat-row">
        <span>Net Income/min:</span>
        <span className={netIncomePerMin >= 0 ? 'positive' : 'negative'}>
          ${netIncomePerMin.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
