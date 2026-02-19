#include <stdio.h>
#include <math.h>
#include <float.h>

    double sinc(double x){
        if (x == 0.0) {
            return 1.0; // sinc(0) is defined to be 1
        } else {
            return sin(x) / x; // sinc(x) = sin(x)/x for x != 0
        }
    }
    double sinc_derivative(double x){
        if (x == 0.0) {
            return DBL_MAX;
        } else {
            return ((x * cos(x) - sin(x))) / (x * x); // derivative of sinc(x) using the quotient rule
        }
    }

int main() {
        double x; // You can change this value to test with different inputs
        printf("Enter a value for x: ");
        scanf("%lf", &x);   
        printf("sinc(%f) = %f\n", x, sinc(x));
        printf("sinc'(%e) = %e\n", x, sinc_derivative(x));
        return 0;
}