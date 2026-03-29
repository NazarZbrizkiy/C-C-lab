#include <stdio.h>
#include <stdlib.h>
#include <math.h>

int main() {
    int n;
    printf("Enter matrix size (n x n): ");
    if (scanf("%d", &n) != 1 || n <= 0 || n >= 200) {
        printf("Invalid size.\n");
        return 1;
    }

    // --- ЗМІНЕНО: Динамічне виділення пам'яті замість VLA ---
    double **a = malloc(n * sizeof(double *));
    for (int i = 0; i < n; i++) {
        a[i] = malloc(2 * n * sizeof(double));
    }
    // ---------------------------------------------------------

    printf("Enter matrix elements:\n");
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%le", &a[i][j]);
        }
    }

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (i == j)
                a[i][j + n] = 1.0;
            else
                a[i][j + n] = 0.0;
        }
    }

    for (int i = 0; i < n; i++) {
        int pivot = i;
        for (int j = i + 1; j < n; j++) {
            if (fabs(a[j][i]) > fabs(a[pivot][i]))
                pivot = j;
        }

        for (int k = 0; k < 2 * n; k++) {
            double temp = a[i][k];
            a[i][k] = a[pivot][k];
            a[pivot][k] = temp;
        }

        if (fabs(a[i][i]) < 1e-12) {
            printf("Matrix is singular and cannot be inverted.\n");
            
            // --- ЗМІНЕНО: Звільняємо пам'ять перед виходом через помилку ---
            for (int f = 0; f < n; f++) free(a[f]);
            free(a);
            // -----------------------------------------------------------------
            
            return 1;
        }

        double div = a[i][i];
        for (int j = 0; j < 2 * n; j++) {
            a[i][j] /= div;
        }

        for (int j = 0; j < n; j++) {
            if (i != j) {
                double factor = a[j][i];
                for (int k = 0; k < 2 * n; k++) {
                    a[j][k] -= factor * a[i][k];
                }
            }
        }
    }

    printf("Inverse matrix:\n");
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            printf("%10.4f ", a[i][j + n]);
        }
        printf("\n");
    }

    // --- ЗМІНЕНО: Звільняємо пам'ять в кінці програми ---
    for (int i = 0; i < n; i++) {
        free(a[i]);
    }
    free(a);
    // ----------------------------------------------------

    return 0;
}