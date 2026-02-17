#include <stdio.h>
#include <math.h>
double softPlus(double x) {
    double softPlus = log(1 + exp(x));
    return softPlus;
}
double softPlus_derivative(double x) {
    double ex = exp(x);
    double softPlus_derivative = ex / (1.0 + exp(x));
    return softPlus_derivative;
}
int main() {
    double x;
    printf("Enter a value for x: ");
    scanf("%lf", &x);
    double result = softPlus(x);
    double derivative = softPlus_derivative(x);
    printf("The value of f(x) at x = %.2f is %.4f\n", x, result);
    printf("The derivative of f(x) at x = %.2f is approximately %.4f\n", x, derivative);
    return 0;
}