#include <stdio.h>
#include <stdlib.h>
#include <time.h>

void printMatrix(double **matrix, int rows, int cols) {
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            printf("%6.2f ", matrix[i][j]);
        }
        printf("\n");
    }
    printf("\n");
}

void fillMatrix(double **matrix, int rows, int cols) {
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            matrix[i][j] = (double)(rand() % 100) / 10.0;
        }
    }
}

void task(double ***matrix, int rows, int *cols, int k) {
    if (k < 0 || k >= *cols || *cols <= 1) {
        printf("Invalid column index or matrix too small\n\n");
        return;
    }
    for (int i = 0; i < rows; i++) {
        for (int j = k; j < *cols - 1; j++) {
            (*matrix)[i][j] = (*matrix)[i][j + 1];
        }
        (*matrix)[i] = realloc((*matrix)[i], (*cols - 1) * sizeof(double));
    }
    (*cols)--;
}

int main() {
    srand(time(NULL));

    int rows = 3;
    int cols = 4;
    int k;

    printf("Enter the column index to delete: ");
    scanf("%d", &k);
    k--; // Convert to 0-based index


    double **matrix = malloc(rows * sizeof(double *));
    for (int i = 0; i < rows; i++) {
        matrix[i] = malloc(cols * sizeof(double));
    }

    fillMatrix(matrix, rows, cols);

    printf("Original matrix:\n");
    printMatrix(matrix, rows, cols);

    printf("Delete column k=%d:\n", k);
    task(&matrix, rows, &cols, k);
    printMatrix(matrix, rows, cols);

    for (int i = 0; i < rows; i++) {
        free(matrix[i]);
    }
    free(matrix);

    return 0;
}