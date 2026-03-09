#include <stdio.h>
#include <math.h>
void task1_1() {
    int x = 2, y = 31;
    int z = x + y;
    printf("z = %d\n", z);
    int x1 = 45,y1 = 54, z1 = 11;
    int result = x1 * y1 - z1;
    printf("result = %d\n", result);
    int x2 = 15, y2 = 4;
    int z2 = x2 / y2;
    printf("z2 = %d\n", z2);
    double x3 = 15.0;
    int y3 = 4;
    double z3 = x3 / y3;
    printf("z3 = %f\n", z3);
    int x4 = 67, y4 = 5;
    int z4 = x4 % y4;
    printf("z4 = %d\n", z4);
    double x5 = 2, y5 = 45.1, z5 = 3.2, z6 = 2;
    double result2 = (x5*y5 + z5) / z6;
    printf("result2 = %f\n", result2);
}
void task1_2(){
    float f1 = 1e-4f;
    float f2 = 24.33e5f;
    float f3 = (float)M_PI;
    float f4 = (float)M_E;
    float f5 = sqrtf(5.0f);
    float f6 = logf(100.0f);

    double d1 = 1e-4;
    double d2 = 24.33e5;
    double d3 = M_PI;
    double d4 = M_E;
    double d5 = sqrt(5.0);
    double d6 = log(100.0);

    long double ld1 = 1e-4L;
    long double ld2 = 24.33e5L;
    long double ld3 = (long double)M_PI;
    long double ld4 = (long double)M_E;
    long double ld5 = sqrtl(5.0L);
    long double ld6 = logl(100.0L);

    printf("float: %e, %e, %f, %f, %f, %f\n", f1, f2, f3, f4, f5, f6);
    printf("double: %e, %e, %f, %f, %f, %f\n", d1, d2, d3, d4, d5, d6);
    printf("long double: %Le, %Le, %Lf, %Lf, %Lf, %Lf\n", ld1, ld2, ld3, ld4, ld5, ld6);
}
void task1_3() {
    int a;
    printf("Enter an integer: ");
    scanf("%d", &a);
    printf("- %d - %d - %d\n", a, a, a);
    printf(" %d | %d | %d\n", a, a, a);
    printf("- %d - %d - %d\n", a, a, a);

}
void task1_8(){
    double d1;
    printf("Enter a first number: ");
    scanf("%lf", &d1);
    double d2;
    printf("Enter a second number: ");
    scanf("%lf", &d2);
    double sum = d1 + d2;
    double difference = d1 - d2;
    printf("Sum: %.2lf\n", sum);
    printf("Difference: %.2lf\n", difference);
}
void task1_9(){
    double d1, d2;
    printf("Enter two numbers: ");
    scanf("%lf %lf", &d1, &d2);
    double average = (d1 + d2) / 2.0;
    double average_of_harmonic = 2.0 / ((1.0 / d1) + (1.0 / d2));
    printf("Average: %e\n", average);
    printf("Average of Harmonic: %e\n", average_of_harmonic);
    printf("Average: %.2lf\n", average);
    printf("Average of Harmonic: %.2lf\n", average_of_harmonic);
}
 int main(){
    task1_9();
    return 0;
 }