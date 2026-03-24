#include <stdio.h>

#define SIZE 4

void printMatrix(int matrix[SIZE][SIZE]) {
    for (int i = 0; i < SIZE; i++) {
        for (int j = 0; j < SIZE; j++) {
            printf("%4d ", matrix[i][j]);
        }
        printf("\n");
    }
}

void rotate270Positive(int matrix[SIZE][SIZE]) {
    for (int i = 0; i < SIZE / 2; i++) {
        for (int j = i; j < SIZE - i - 1; j++) {
            int temp = matrix[i][j];
    
            matrix[i][j] = matrix[SIZE - 1 - j][i];
            
            matrix[SIZE - 1 - j][i] = matrix[SIZE - 1 - i][SIZE - 1 - j];

            matrix[SIZE - 1 - i][SIZE - 1 - j] = matrix[j][SIZE - 1 - i];

            matrix[j][SIZE - 1 - i] = temp;
        }
    }
}

int main() {
    int matrix[SIZE][SIZE] = {
        { 1,  2,  3,  4},
        { 5,  6,  7,  8},
        { 9, 10, 11, 12},
        {13, 14, 15, 16}
    };

    printf("Starting matrix:\n");
    printMatrix(matrix);

    rotate270Positive(matrix);

    printf("\nMatrix after rotation by 270 degrees in the positive direction:\n");
    printMatrix(matrix);

    return 0;
}