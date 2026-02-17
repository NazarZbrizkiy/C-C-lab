#include <stdio.h>
#include <stdlib.h>
#include <math.h>
int mediana(double a, double b, double c) {
    double m1 = 0.5 * sqrt(2*pow(a, 2)+2*pow(b, 2)-pow(c, 2));
    printf("Mediana1: %lf\n", m1);
    double m2 = 0.5 * sqrt(2*pow(a, 2)+2*pow(c, 2)-pow(b, 2));
    printf("Mediana2: %lf\n", m2);
    double m3 = 0.5 * sqrt(2*pow(b, 2)+2*pow(c, 2)-pow(a, 2));
    printf("Mediana3: %lf\n", m3);
}
int main() {
    double a, b, c;
    printf("Enter the three sides of the triangle: ");
    scanf("%lf %lf %lf", &a, &b, &c);
    if (a + b <= c || a + c <= b || b + c <= a) {
        printf("The sides do not form a triangle.\n");
        return 1;
    }
    mediana(a, b, c);
    return 0;
}
