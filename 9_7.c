#include <stdio.h>
#include <stdlib.h>

void readArray(unsigned long long *arr, int n) {
    for (int i = 0; i < n; i++) {
        scanf("%llu", &arr[i]);
    }
}

void processArray(unsigned long long *arr, int n) {
    int countTwo = 0;
    int countThree = 0;

    for (int i = 0; i < n; i++) {
        unsigned long long temp2 = arr[i];
        if (temp2 > 0) {
            while (temp2 % 2 == 0 && temp2 > 1) {
                temp2 /= 2;
            }
            if (temp2 == 1) {
                countTwo++;
            }
        }

        unsigned long long temp3 = arr[i];
        if (temp3 > 0) {
            while (temp3 % 3 == 0 && temp3 > 1) {
                temp3 /= 3;
            }
            if (temp3 == 1) {
                countThree++;
            }
        }
    }

    printf("Powers of two: %d\n", countTwo);
    printf("Powers of three: %d\n", countThree);
}

int main() {
    int n;

    printf("Enter n: ");
    if (scanf("%d", &n) != 1 || n <= 0) {
        return 1;
    }

    unsigned long long *arr = (unsigned long long *)malloc(n * sizeof(unsigned long long));

    printf("Enter array elements:\n");
    readArray(arr, n);

    processArray(arr, n);

    free(arr);

    return 0;
}