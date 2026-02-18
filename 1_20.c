#include <stdio.h>
#include <math.h>
int main() {
    double a,b,c;
    double x1,x2;
    printf("Enter a, b, c u formati A=xxx.xxx i td: ");
    scanf("A=%lf, B=%lf, C=%lf", &a, &b, &c);
    x1 = (a + b + c) / 3;
    x2 = 3 / (1/a + 1/b + 1/c);
    printf("Seredne arith: %lf\n", x1);
    printf("Seredne harmon: %lf\n", x2);
}