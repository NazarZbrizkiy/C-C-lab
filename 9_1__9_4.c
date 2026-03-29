#include <stdio.h>
#include <stdlib.h>
#include <math.h>

void task1() {
    int n;
    printf("Enter a natural number n: ");
    if (scanf("%d", &n) != 1 || n <= 0) return;

    double *arr = (double*)malloc(n * sizeof(double));
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
    int count = 0;
    int num;

    printf("Enter integers (enter 0 to stop, max 100):\n");
    while (count < 100) {
        scanf("%d", &num);
        if (num == 0) break;
        arr[count++] = num;
    }

    int squares = 0;
    int cubes = 0;

    for (int i = 0; i < count; i++) {
        if (arr[i] > 0) {
            int sq_root = (int)round(sqrt(arr[i]));
            if (sq_root * sq_root == arr[i]) squares++;
        }
        
        int cb_root = (int)round(cbrt(arr[i]));
        if (cb_root * cb_root * cb_root == arr[i]) cubes++;
    }

    printf("Total elements: %d\n", count);
    printf("Perfect squares count: %d\n", squares);
    printf("Perfect cubes count: %d\n", cubes);
}

double* create_vector(int n) {
    double* v = (double*)malloc(n * sizeof(double));
    printf("Enter %d elements for the vector:\n", n);
    for (int i = 0; i < n; i++) {
        scanf("%lf", &v[i]);
    }
    return v;
}

void free_vector(double* v) {
    free(v);
}

void task3() {
    int n1, n2;

    printf("Enter the size of the first vector: ");
    scanf("%d", &n1);
    double* v1 = create_vector(n1);

    printf("Enter the size of the second vector: ");
    scanf("%d", &n2);
    double* v2 = create_vector(n2);

    if (n1 == n2) {
        double* result = (double*)malloc(n1 * sizeof(double));
        printf("Difference vector:\n");
        for (int i = 0; i < n1; i++) {
            result[i] = v1[i] - v2[i];
            printf("%lf ", result[i]);
        }
        printf("\n");
        free_vector(result);
    } else {
        printf("Error: Vectors must have the same size to compute difference.\n");
    }

    free_vector(v1);
    free_vector(v2);
}

double** create_matrix(int n) {
    double** m = (double**)malloc(n * sizeof(double*));
    for (int i = 0; i < n; i++) {
        m[i] = (double*)calloc(n, sizeof(double));
    }
    return m;
}

void input_matrix(double** m, int n) {
    printf("Enter elements for the %dx%d matrix:\n", n, n);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%lf", &m[i][j]);
        }
    }
}

void free_matrix(double** m, int n) {
    for (int i = 0; i < n; i++) {
        free(m[i]);
    }
    free(m);
}

void task4() {
    int n;
    printf("Enter the dimension n for square matrices: ");
    scanf("%d", &n);

    double** matrix1 = create_matrix(n);
    input_matrix(matrix1, n);

    double** matrix2 = create_matrix(n);
    input_matrix(matrix2, n);

    double** result_matrix = create_matrix(n);
    printf("Sum of the two matrices:\n");
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            result_matrix[i][j] = matrix1[i][j] + matrix2[i][j];
            printf("%lf ", result_matrix[i][j]);
        }
        printf("\n");
    }

    free_matrix(matrix1, n);
    free_matrix(matrix2, n);
    free_matrix(result_matrix, n);
}

int main() {
    task1();

    return 0;
}