#include <stdio.h>

double solve_e(double x) {
    double x2 = x * x;
    double y = x * (x2 * (x2 + 1) + 1);
    return y;
}

int main() {
    double x;

    printf("Enter x: ");
    scanf("%lf", &x);

    double result = solve_e(x);

    printf("Result: %.4f\n", result);

    return 0;
}