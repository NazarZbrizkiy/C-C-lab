#include <stdio.h>

int main() {
    int n, a, b, c;

    printf("Enter a natural 3-digit number: ");
    scanf("%d", &n);

    if (n < 100 || n > 999) {
        printf("Error: The number must be 3 digits.\n");
        return 1;
    }

    a = n / 100;
    b = (n / 10) % 10;
    c = n % 10;

    if (a != b && a != c && b != c) {
        printf("%d%d%d\n", a, b, c);
        printf("%d%d%d\n", a, c, b);
        printf("%d%d%d\n", b, a, c);
        printf("%d%d%d\n", b, c, a);
        printf("%d%d%d\n", c, a, b);
        printf("%d%d%d\n", c, b, a);
    } else {
        printf("The digits are not distinct.\n");
    }

    return 0;
}