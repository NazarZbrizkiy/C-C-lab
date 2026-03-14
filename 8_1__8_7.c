#include <stdio.h>
#include <stdlib.h>
#include <math.h>
void task8_1(){
    int matrix[3][3] = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    int N, M;

    printf("Enter the number N and M: ");
    scanf("%d %d", &N, &M);
    
    for(int i = 0; i < 3; i++){
        for(int j = 0; j < 3; j++){
            if(matrix[i][j] == M){
                matrix[i][j] = N;
            }
        }
    }
    printf("The new matrix is:\n");
    for(int i = 0; i < 3; i++){
        for(int j = 0; j < 3; j++){
            printf("%d ", matrix[i][j]);
        }
        printf("\n");
    }
}

void task8_2(){
    double matrix[3][3] = {{1.0, 2.0, 3.0}, {4.0, 5.0, 6.0}, {7.0, 8.0, 9.0}};
    int i, j;
    double a;
    printf("Enter the i and j: ");
    scanf("%d %d", &i, &j);
    printf("Enter the value a: ");
    scanf("%lf", &a);
    
    matrix[i-1][j-1] = a;
    
    for (i = 0; i < 3; i++){
        for (j = 0; j < 3; j++){
            printf("%.2lf ", matrix[i][j]);
        }
        printf("\n");
    }
}

void task8_3(){
    int i, j;
    printf("Enter the number of rows and columns: ");
    scanf("%d %d", &i, &j);
    if(i <= 0 || j <= 0 || i > 20 || j > 20){
        printf("Invalid input. Number of rows and columns must be positive or less than or equal to 20.\n");
        return;
    }
    double matrix[i][j];
    for (int m = 0; m < i; m++){
        for (int n = 0; n < j; n++){
            printf("Enter the value for matrix[%d][%d]: ", m, n);
            scanf("%lf", &matrix[m][n]);
        }
    }
    for (int m = 0; m < i; m++){
        for (int n = 0; n < j; n++){
            printf("%.2lf ", matrix[m][n]);
        }
        printf("\n");
    }
}

void task8_4(){
    int i, j;
    printf("Enter the number of rows and columns: ");
    scanf("%d %d", &i, &j);
    if(i <= 0 || j <= 0 || i > 20 || j > 20){
        printf("Invalid input. Number of rows and columns must be positive or less than or equal to 20.\n");
        return;
    }
    double matrix[i][j];
    for (int m = 0; m < i; m++){
        for (int n = 0; n < j; n++){
            printf("Enter the value for matrix[%d][%d]: ", m, n);
            scanf("%lf", &matrix[m][n]);
        }
    }
    printf("Original matrix:\n");
    for (int m = 0; m < i; m++){
        for (int n = 0; n < j; n++){
            printf("%.2lf ", matrix[m][n]);
        }
        printf("\n");
    }
    
    printf("Transposed matrix:\n");
    for (int m = 0; m < j; m++){
        for (int n = 0; n < i; n++){
            printf("%.2lf ", matrix[n][m]);
        }
        printf("\n");
    }
}

int task8_7() {
    int n;

    printf("Enter the size of the square matrix (n): ");
    if (scanf("%d", &n) != 1 || n <= 0) {
        printf("Error: invalid matrix size.\n");
        return 1;
    }

    double **matrix = (double **)malloc(n * sizeof(double *));
    for (int i = 0; i < n; i++) {
        matrix[i] = (double *)malloc(n * sizeof(double));
    }

    printf("Enter the elements of the matrix (%d x %d):\n", n, n);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%lf", &matrix[i][j]);
        }
    }

    double det = 1.0;
    int sign = 1;

    for (int i = 0; i < n; i++) {
        int pivot_row = i;
        for (int k = i + 1; k < n; k++) {
            if (fabs(matrix[k][i]) > fabs(matrix[pivot_row][i])) {
                pivot_row = k;
            }
        }

        if (fabs(matrix[pivot_row][i]) < 1e-9) {
            det = 0.0;
            break;
        }

        if (pivot_row != i) {
            double *temp = matrix[i];
            matrix[i] = matrix[pivot_row];
            matrix[pivot_row] = temp;
            sign *= -1;
        }

        for (int k = i + 1; k < n; k++) {
            double factor = matrix[k][i] / matrix[i][i];
            for (int j = i; j < n; j++) {
                matrix[k][j] -= factor * matrix[i][j];
            }
        }

        det *= matrix[i][i];
    }

    det *= sign;

    printf("Determinant of the matrix: %.6lf\n", det);

    for (int i = 0; i < n; i++) {
        free(matrix[i]);
    }
    free(matrix);

    return 0;
}


int main(){
    task8_1();
    return 0;
}