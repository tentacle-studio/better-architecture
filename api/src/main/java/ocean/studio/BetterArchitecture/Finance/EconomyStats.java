package ocean.studio.BetterArchitecture.Finance;

import java.util.HashMap;
import java.util.Map;

public class EconomyStats {
    private Map<String, Double> incomeBySource;
    private Map<String, Integer> incomeCountBySource;
    private Map<String, Double> expensesByCategory;
    private Map<String, Integer> expenseCountByCategory;
    private int totalRequestsProcessed;
    private int totalRequestsFailed;
    private int totalMaliciousBlocked;
    private int totalMaliciousPassed;
    
    // Simple income/expenses tracking for display
    private double incomeThisMinute = 0.0;
    private double expensesThisMinute = 0.0;

    public EconomyStats() {
        this.incomeBySource = new HashMap<>();
        this.incomeCountBySource = new HashMap<>();
        this.expensesByCategory = new HashMap<>();
        this.expenseCountByCategory = new HashMap<>();
        this.totalRequestsProcessed = 0;
        this.totalRequestsFailed = 0;
        this.totalMaliciousBlocked = 0;
        this.totalMaliciousPassed = 0;
        this.incomeThisMinute = 0.0;
        this.expensesThisMinute = 0.0;
    }

    public void addIncome(double amount, String source) {
        incomeBySource.put(source, incomeBySource.getOrDefault(source, 0.0) + amount);
        incomeCountBySource.put(source, incomeCountBySource.getOrDefault(source, 0) + 1);
        this.incomeThisMinute += amount;
    }

    public void addExpense(double amount, String category) {
        expensesByCategory.put(category, expensesByCategory.getOrDefault(category, 0.0) + amount);
        expenseCountByCategory.put(category, expenseCountByCategory.getOrDefault(category, 0) + 1);
        this.expensesThisMinute += amount;
    }

    public void incrementRequestsProcessed() {
        totalRequestsProcessed++;
    }

    public void incrementRequestsFailed() {
        totalRequestsFailed++;
    }

    public void incrementMaliciousBlocked() {
        totalMaliciousBlocked++;
    }

    public void incrementMaliciousPassed() {
        totalMaliciousPassed++;
    }

    // Getters
    public Map<String, Double> getIncomeBySource() {
        return incomeBySource;
    }

    public Map<String, Integer> getIncomeCountBySource() {
        return incomeCountBySource;
    }

    public Map<String, Double> getExpensesByCategory() {
        return expensesByCategory;
    }

    public Map<String, Integer> getExpenseCountByCategory() {
        return expenseCountByCategory;
    }

    public int getTotalRequestsProcessed() {
        return totalRequestsProcessed;
    }

    public int getTotalRequestsFailed() {
        return totalRequestsFailed;
    }

    public int getTotalMaliciousBlocked() {
        return totalMaliciousBlocked;
    }

    public int getTotalMaliciousPassed() {
        return totalMaliciousPassed;
    }
    
    public double getIncomeThisMinute() {
        return incomeThisMinute;
    }
    
    public double getExpensesThisMinute() {
        return expensesThisMinute;
    }
    
    public void resetMinuteStats() {
        this.incomeThisMinute = 0.0;
        this.expensesThisMinute = 0.0;
    }
}
