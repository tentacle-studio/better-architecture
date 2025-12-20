package ocean.studio.BetterArchitecture.Finance;

public class GameEconomy {
    private double totalRevenue;
    private double totalExpenses;
    private double revenuePerMinute;
    private double expensesPerMinute;
    
    // No-argument constructor
    public GameEconomy() {
        this.totalRevenue = 0.0;
        this.totalExpenses = 0.0;
        this.revenuePerMinute = 0.0;
        this.expensesPerMinute = 0.0;
    }
    
    // Add revenue from successful requests
    public void addRevenue(double amount) {
        this.totalRevenue += amount;
    }
    
    // Add expenses from upkeep costs
    public void addExpense(double amount) {
        this.totalExpenses += amount;
    }
    
    // Calculate revenue per minute (for display)
    public void updateRevenueRate(double revenueInInterval, double intervalSeconds) {
        this.revenuePerMinute = (revenueInInterval / intervalSeconds) * 60.0;
    }
    
    // Calculate expenses per minute (for display)
    public void updateExpenseRate(double expensesInInterval, double intervalSeconds) {
        this.expensesPerMinute = (expensesInInterval / intervalSeconds) * 60.0;
    }
    
    // Net income per minute
    public double getNetIncomePerMinute() {
        return revenuePerMinute - expensesPerMinute;
    }
    
    // Total profit/loss
    public double getNetProfit() {
        return totalRevenue - totalExpenses;
    }
    
    // Reset tracking (for new intervals)
    public void resetRates() {
        this.revenuePerMinute = 0.0;
        this.expensesPerMinute = 0.0;
    }
    
    // Getters
    public double getTotalRevenue() {
        return totalRevenue;
    }
    
    public double getTotalExpenses() {
        return totalExpenses;
    }
    
    public double getRevenuePerMinute() {
        return revenuePerMinute;
    }
    
    public double getExpensesPerMinute() {
        return expensesPerMinute;
    }
    
    // Setters
    public void setTotalRevenue(double totalRevenue) {
        this.totalRevenue = totalRevenue;
    }
    
    public void setTotalExpenses(double totalExpenses) {
        this.totalExpenses = totalExpenses;
    }
    
    public void setRevenuePerMinute(double revenuePerMinute) {
        this.revenuePerMinute = revenuePerMinute;
    }
    
    public void setExpensesPerMinute(double expensesPerMinute) {
        this.expensesPerMinute = expensesPerMinute;
    }
}