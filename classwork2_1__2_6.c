#include <stdio.h>
#include <math.h>
void task2_1() {
    double a;
    printf("Enter a number: ");
    scanf("%lf", &a);
    double result = cos(a);
    printf("The cosine of %.2lf is %.2lf\n", a, result);
}
void task2_2() {
    double a, b;
    printf("Enter two numbers: ");
    scanf("%lf %lf", &a, &b);
    double c = hypot(a, b);
    printf("The hypotenuse of %.2lf and %.2lf is %.2lf\n", a, b, c);
}
void task2_3() {
    double a, b, c;
    printf("Enter three numbers: ");
    scanf("%lf %lf %lf", &a, &b, &c);
    double p = (a + b + c) / 2;
    double area = sqrt(p * (p - a) * (p - b) * (p - c));
    printf("The area of the triangle is %.2lf\n", area);
}
void task2_4a() {
    double x;
    printf("Enter a number: ");
    scanf("%lf", &x);
    double y = pow(x, 4) - 2 * pow(x, 2) + 1;
    printf("The value of the expression is %.2lf\n", y);
}
void task2_4d(){
    double x;
    printf("Enter a number: ");
    scanf("%lf", &x);
    double y = 16*pow(x, 4) + 8*pow(x, 3) + 4*pow(x, 2) + 2*x + 1;
    printf("The value of the expression is %.2lf\n", y);
}
double distance(double x1, double y1, double x2, double y2) {
    return hypot(x2 - x1, y2 - y1);
}
double area(double a, double b, double c) {
    double p = (a + b + c) / 2;
    return sqrt(p * (p - a) * (p - b) * (p - c));
}
void task2_6(){
    double ax, ay, bx, by, cx, cy;
    printf("Enter the coordinates of point A (x y): \n");
    scanf("%lf %lf", &ax, &ay);
    printf("Enter the coordinates of point B (x y): \n");
    scanf("%lf %lf", &bx, &by);
    printf("Enter the coordinates of point C (x y): \n");
    scanf("%lf %lf", &cx, &cy);
    double sideAB = distance(ax, ay, bx, by);
    double sideBC = distance(bx, by, cx, cy);
    double sideCA = distance(cx, cy, ax, ay);
    double triangleArea = area(sideAB, sideBC, sideCA);
    printf("The lengths of the sides of the triangle are: AB = %.2lf, BC = %.2lf, CA = %.2lf\n", sideAB, sideBC, sideCA);
    printf("The area of the triangle formed by points A, B, and C is %.2lf\n", triangleArea);
}
int main() {
    task2_4d();
    return 0;
}