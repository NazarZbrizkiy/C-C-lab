#include <stdio.h>
#include <math.h>

void task16_zh() {
    double x, eps;
    
    printf("Enter x (|x| < 1): ");
    scanf("%lf", &x);
    
    if (fabs(x) >= 1.0) {
        printf("Error: |x| must be strictly less than 1.\n");
        return;
    }
    
    printf("Enter epsilon (e.g., 0.0001): ");
    scanf("%lf", &eps);
    
    double sum = 0.0;
    double term = 2.0 * x;
    double x_sq = x * x;
    int n = 1;
    
    while (fabs(term) >= eps) {
        sum += term;
        term = term * x_sq * (2.0 * n - 1.0) / (2.0 * n + 1.0);
        n++;
    }
    
    printf("\nCalculated sum: %.8lf\n", sum);
    printf("Exact value ln((1+x)/(1-x)): %.8lf\n", log((1.0 + x) / (1.0 - x)));
    printf("Terms computed: %d\n", n - 1);
}

int main() {
    task16_zh();
    return 0;
}
