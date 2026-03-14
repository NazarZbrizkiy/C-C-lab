#include <stdio.h>

double calculate_polynomial_b(double x, int n) {
    double y = 1.0;
    double term = x;
    
    for (int i = 0; i < n; ++i) {
        term = term * term * term;
        y += term;
    }
    
    return y;
}

int main() {
    double x_val;
    int n_val;
    
    printf("Введіть значення x: ");
    scanf("%lf", &x_val);
    
    printf("Введіть значення n (ціле число): ");
    scanf("%d", &n_val);
    
    double result = calculate_polynomial_b(x_val, n_val);
    
    printf("При x = %.2f та n = %d, результат y = %.2f\n", x_val, n_val, result);
    
    return 0;
}