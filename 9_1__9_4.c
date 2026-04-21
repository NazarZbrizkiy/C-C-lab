#include <stdio.h>
#include <stdlib.h>
#include <math.h>

int inputArray(int *arr) {
    int count = 0;
    int temp;
    printf("Enter integers (0 to stop, max 100):\n");
    while (count < 100) {
        scanf("%d", &temp);
        if (temp == 0) break;
        arr[count++] = temp;
    }
    return count;
}

int isPerfectSquare(int n) {
    if (n < 0) return 0;
    int root = (int)round(sqrt(n));
    return root * root == n;
}

int isPerfectCube(int n) {
    int root = (int)round(cbrt(n));
    return root * root * root == n;
}

double* createAndInputVector(int n) {
    double* vec = (double*)malloc(n * sizeof(double));
    if (!vec) return NULL;
    printf("Enter %d elements for the vector:\n", n);
    for (int i = 0; i < n; i++) {
        scanf("%lf", &vec[i]);
    }
    return vec;
}

void freeVector(double* vec) {
    free(vec);
}

double** createMatrix2D(int n) {
    double** mat = (double**)malloc(n * sizeof(double*));
    for (int i = 0; i < n; i++) {
        mat[i] = (double*)calloc(n, sizeof(double));
    }
    return mat;
}

void inputMatrix2D(double** mat, int n) {
    printf("Enter elements for the %dx%d matrix:\n", n, n);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%lf", &mat[i][j]);
        }
    }
}

void freeMatrix2D(double** mat, int n) {
    for (int i = 0; i < n; i++) {
        free(mat[i]);
    }
    free(mat);
}

double* createMatrix1D(int n) {
    return (double*)calloc(n * n, sizeof(double));
}

void inputMatrix1D(double* mat, int n) {
    printf("Enter elements for the %dx%d matrix:\n", n, n);
    for (int i = 0; i < n * n; i++) {
        scanf("%lf", &mat[i]);
    }
}

void freeMatrix1D(double* mat) {
    free(mat);
}

void task1() {
    int n;
    printf("Enter a natural number n: ");
    if (scanf("%d", &n) != 1 || n <= 0) {
        printf("Invalid input.\n");
        return;
    }

    double *arr = (double *)malloc(n * sizeof(double));
    if (!arr) {
        printf("Memory allocation failed.\n");
        return;
    }

    double sum_of_squares = 0.0;
    printf("Enter %d real numbers:\n", n);
    for (int i = 0; i < n; i++) {
        scanf("%lf", &arr[i]);
        sum_of_squares += arr[i] * arr[i];
    }

    printf("Sum of squares: %lf\n", sum_of_squares);
    free(arr);
}

void task2() {
    int arr[100];
    int n = inputArray(arr);
    
    int squares = 0;
    int cubes = 0;
    
    for (int i = 0; i < n; i++) {
        if (isPerfectSquare(arr[i])) squares++;
        if (isPerfectCube(arr[i])) cubes++;
    }
    
    printf("Number of elements: %d\n", n);
    printf("Perfect squares: %d\n", squares);
    printf("Perfect cubes: %d\n", cubes);
}

void task3() {
    int n1, n2;
    
    printf("Enter dimension of the first vector: ");
    scanf("%d", &n1);
    double* v1 = createAndInputVector(n1);

    printf("Enter dimension of the second vector: ");
    scanf("%d", &n2);
    double* v2 = createAndInputVector(n2);

    if (n1 == n2) {
        double* diff = (double*)malloc(n1 * sizeof(double));
        if (diff) {
            printf("Difference vector:\n");
            for (int i = 0; i < n1; i++) {
                diff[i] = v1[i] - v2[i];
                printf("%lf ", diff[i]);
            }
            printf("\n");
            freeVector(diff);
        }
    } else {
        printf("Error: Vectors must have the same dimension to be subtracted.\n");
    }

    if (v1) freeVector(v1);
    if (v2) freeVector(v2);
}

void task4_2d() {
    int n1, n2;
    
    printf("Enter size of the first square matrix: ");
    scanf("%d", &n1);
    double** m1 = createMatrix2D(n1);
    inputMatrix2D(m1, n1);

    printf("Enter size of the second square matrix: ");
    scanf("%d", &n2);
    double** m2 = createMatrix2D(n2);
    inputMatrix2D(m2, n2);

    if (n1 == n2) {
        double** res = createMatrix2D(n1);
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n1; j++) {
                for (int k = 0; k < n1; k++) {
                    res[i][j] += m1[i][k] * m2[k][j];
                }
            }
        }
        
        printf("Product of the matrices:\n");
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n1; j++) {
                printf("%lf ", res[i][j]);
            }
            printf("\n");
        }
        freeMatrix2D(res, n1);
    } else {
        printf("Error: Matrices must be of the same size for this operation.\n");
    }

    freeMatrix2D(m1, n1);
    freeMatrix2D(m2, n2);
}

void task4_1d() {
    int n1, n2;
    
    printf("Enter size of the first square matrix: ");
    scanf("%d", &n1);
    double* m1 = createMatrix1D(n1);
    inputMatrix1D(m1, n1);

    printf("Enter size of the second square matrix: ");
    scanf("%d", &n2);
    double* m2 = createMatrix1D(n2);
    inputMatrix1D(m2, n2);

    if (n1 == n2) {
        double* res = createMatrix1D(n1);
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n1; j++) {
                for (int k = 0; k < n1; k++) {
                    res[i * n1 + j] += m1[i * n1 + k] * m2[k * n1 + j];
                }
            }
        }
        
        printf("Product of the matrices:\n");
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n1; j++) {
                printf("%lf ", res[i * n1 + j]);
            }
            printf("\n");
        }
        freeMatrix1D(res);
    } else {
        printf("Error: Matrices must be of the same size for this operation.\n");
    }

    freeMatrix1D(m1);
    freeMatrix1D(m2);
}

int main() {
    task1();
    
    return 0;
}