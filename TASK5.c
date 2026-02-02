#include <stdio.h>

double power_15(double x) {
    double x2 = x * x;
    double x3 = x2 * x;
    double x6 = x3 * x3;
    double x12 = x6 * x6;
    double x15 = x12 * x3;
    return x15;
}

int main() {
    double x;

    printf("Введіть число: ");
    if (scanf("%lf", &x) != 1) {
        printf("Помилка: введіть коректне число.\n");
        return 1;
    }

    double result = power_15(x);
    
    printf("%.2f у 15-му степені = %.2f\n", x, result);

    return 0;
}