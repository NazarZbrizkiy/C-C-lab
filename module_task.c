#include <stdio.h>
#include <math.h>
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

int main() {
    int a, b, c;
    printf("Enter three natural numbers: ");
    scanf("%d %d %d", &a, &b, &c);
    int result = max_abs(a, b, c);
    printf("The number with the largest absolute value is: %d\n", result);
    int result2 = min_abs_three(a, b, c);
    printf("The number with the smallest absolute value is: %d\n", result2);
}