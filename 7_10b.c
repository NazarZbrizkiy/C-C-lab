#include <stdio.h>

int main() {
    int n;

    printf("Enter n (n >= 2): ");
    scanf("%d", &n);

    if (n < 2) {
        printf("Error: n must be at least 2.\n");
        return 1;
    }

    int a[n];

    printf("Enter %d integers (separated by space): ", n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }

    int min_sum = a[0] + a[1];

    for (int i = 1; i < n - 1; i++) {
        int current_sum = a[i] + a[i + 1];

        if (current_sum < min_sum) {
            min_sum = current_sum;
        }
    }

    printf("Minimum sum of adjacent elements: %d\n", min_sum);

    return 0;
}