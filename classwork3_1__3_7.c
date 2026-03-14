#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <math.h>
void task3_1(){
    int a;
    printf("Enter an integer(at least three digits): ");
    scanf("%d", &a);
    if (a < 100) {
        printf("The number must have at least three digits.\n");
    }
    else {
        if (a > 999) {
                printf("The number must have at most three digits.\n");
            }
            else {
                int hundreds = a / 100;
                int tens = (a / 10) % 10;
                int units = a % 10;
                printf("Hundreds: %d\n", hundreds);
                printf("Tens: %d\n", tens);
                printf("Units: %d\n", units);
                printf("Sum of digits: %d\n", hundreds + tens + units);
                printf("Reverse of the number: %d%d%d\n", units, tens, hundreds);

            }
        }
        return;
    
}
void task3_2(){
    int a;
    printf("Enter an integer(natural three-digit number): ");
    scanf("%d", &a);
    if (a < 100 || a > 999) {
        printf("The number must be a three-digit natural number.\n");
    } else {
        int hundreds = a / 100;
        int tens = (a / 10) % 10;
        int units = a % 10;
        printf("Hundreds: %d\n", hundreds);
        printf("Tens: %d\n", tens);
        printf("Units: %d\n", units);
        if (hundreds == tens && tens == units && hundreds == units) {
            printf("All digits are the same.\n");
        } else if (hundreds == tens || tens == units || hundreds == units) {
            printf("Two digits are the same.\n");
        } else {
            printf("%d %d %d,\n", hundreds, tens, units);
            printf("%d %d %d,\n", hundreds, units, tens);
            printf("%d %d %d,\n", tens, hundreds, units);
            printf("%d %d %d,\n", tens, units, hundreds);
            printf("%d %d %d,\n", units, hundreds, tens);
            printf("%d %d %d\n", units, tens, hundreds);

        }
    }
}
void task3_3(){
    int a, b, c;
    printf("Enter three integers: ");
    scanf("%d, %d, %d", &a, &b, &c);
    printf("You entered: %d, %d, %d\n", a, b, c);
    if(a > pow(2, 10) || b > pow(2, 10) || c > pow(2, 10)) {
        printf("The numbers must be less than or equal to 2^10.\n");
    } else {
        int sum = a + b + c;
        printf("Sum: %d\n", sum);
    }
}
uint16_t multiply(uint16_t x, uint16_t y) {
    return x * y;
}
void task3_4(){
    uint8_t a, b;
    printf("Enter two integers (0-255): ");
    scanf("%hhu %hhu", &a, &b);
    uint16_t result = multiply(a, b);
    printf("Result of multiplication: %u\n", result);
}
void task3_5(){
    double a, b;
    printf("Enter two floating-point numbers: ");
    scanf("%lf %lf", &a, &b);
    if(a > b) {
        printf("The larger number is: %.2lf, and the smaller number is: %.2lf\n", a, b);
    } else if (b > a) {
        printf("The larger number is: %.2lf, and the smaller number is: %.2lf\n", b, a);
    } else {
        printf("Both numbers are equal.\n");
    }
}
int max_abs(int a, int b, int c) {
    int abs_a = abs(a);
    int abs_b = abs(b);
    int abs_c = abs(c);

    if (abs_a >= abs_b && abs_a >= abs_c) {
        return a;
    } else if (abs_b >= abs_a && abs_b >= abs_c) {
        return b;
    } else {
        return c;
    }
}
int min_abs(int a, int b) {
    int abs_a = abs(a);
    int abs_b = abs(b);

    if (abs_a <= abs_b) 
        return a;

    return b;
}
int min_abs_three(int a, int b, int c) {
    return min_abs(min_abs(a, b), c);
}

void task3_6(){
    int a, b, c;
    printf("Enter three natural numbers: ");
    scanf("%d %d %d", &a, &b, &c);
    int result = max_abs(a, b, c);
    printf("The number with the largest absolute value is: %d\n", result);
    int result2 = min_abs_three(a, b, c);
    printf("The number with the smallest absolute value is: %d\n", result2);
}
void task3_7() {
    double a, b, c, d;
    
    printf("ax^2 + bx + c = 0\nEnter a, b, c: ");
    scanf("%lf %lf %lf", &a, &b, &c);
    
    if (a == 0) {
        if (b != 0) printf("Solutions: 1\nx = %.2lf\n", -c / b);
        else printf(c == 0 ? "Infinite solutions\n" : "Solutions: 0\n");
    } else {
        d = b * b - 4.0 * a * c;
        if (d > 0) printf("Solutions: 2\nx1 = %.2lf\nx2 = %.2lf\n", (-b + sqrt(d)) / (2.0 * a), (-b - sqrt(d)) / (2.0 * a));
        else if (d == 0) printf("Solutions: 1\nx = %.2lf\n", -b / (2.0 * a));
        else printf("Solutions: 0\n");
    }
}

int main() {
    task3_6();
    return 0;
}