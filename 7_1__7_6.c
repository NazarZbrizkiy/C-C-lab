#include <stdio.h>
#include <math.h>
#define Euler 2.71828
void task7_1() {
    double numbers[5] = {1, 24, 31, 4, 55};
    double n;
    printf("Enter number for comparison:");
    scanf("%lf", &n);
    int count = 0;
    for (int i = 0; i < 5; i++){
        if (numbers[i] < n){
            count ++;
        }
    }
    printf("Count of numbers less than %.1lf: %d\n", n, count);
}
void task7_2(){
    int mas[] = {5, 112, 4, 3};
    int n = 4;
    printf("Elements on the contrary:\n");
    for (int i = n - 1; i >= 0; i--){
        printf("%d ", mas[i]);
    }
    printf("\n");
    return;
}
double numbers_more_than_Euler(double arr[], int size){
    int count = 0;
    double sum = 0;
    for (int i = 0; i < size; i++){
        if (arr[i] > Euler){
            sum += arr[i];
        }
    }
    return sum;
}
void task7_3(){
    double numbers[10] = {};
    for(int i = 0; i < 10; i++){
        printf("Enter number %d: ", i + 1);
        scanf("%lf", &numbers[i]);
    }
    double sum = numbers_more_than_Euler(numbers, 10);
    printf("Sum of numbers more than Euler: %.2lf\n", sum);
}
void task7_4(){
    long long numbers[5] = {}; // Using long long to handle larger numbers
    long long max_number = 0;
    printf("Enter 5 numbers:");
    for (int i = 0; i < 5; i++){
        scanf("%lld", &numbers[i]);
        if(numbers[i] > max_number){
            max_number = numbers[i];
        }
    }
printf("Max number: %lld\n", max_number);

}
void task7_5(){
    int mas_numbers[50] = {};
    int count_even = 0;
    int count_odd = 0;
    for(int i = 0; i < 50; i++){
        
        printf("Enter number %d: ", i + 1);
        scanf("%d", &mas_numbers[i]);
        if (mas_numbers[i] == 0) {
            break;
        }
        if( mas_numbers[i] % 2 == 0){
            count_even++;
        } else {
            count_odd++;
        }
    }
    printf("Count of even numbers: %d\n", count_even);
    printf("Count of odd numbers: %d\n", count_odd);
}

void input_vector(double vec[], int n, int vec_num) {
    printf("Enter %d elements for vector %d (separated by space): ", n, vec_num);
    for (int i = 0; i < n; i++) {
        scanf("%lf", &vec[i]);
    }
}

void print_vector(double vec[], int n) {
    printf("(");
    for (int i = 0; i < n; i++) {
        printf("%.2lf", vec[i]);
        if (i < n - 1) {
            printf(", ");
        }
    }
    printf(")\n");
}

void sum_vectors(double v1[], double v2[], double result[], int n) {
    for (int i = 0; i < n; i++) {
        result[i] = v1[i] + v2[i];
    }
}

double dot_product(double v1[], double v2[], int n) {
    double product = 0.0;
    for (int i = 0; i < n; i++) {
        product += v1[i] * v2[i];
    }
    return product;
}

void task7_6() {
    int n;
    
    printf("Enter the dimension of vectors n (n < 20): ");
    scanf("%d", &n);
    
    if (n <= 0 || n >= 20) {
        printf("Error: dimension must be between 1 and 19.\n");
        return; 
    }
    
    double vec1[20], vec2[20], sum_vec[20];
    
    input_vector(vec1, n, 1);
    input_vector(vec2, n, 2);
    
    sum_vectors(vec1, vec2, sum_vec, n);
    
    double scalar = dot_product(vec1, vec2, n);
    
    printf("\n--- Results ---\n");
    printf("Vector 1:        ");
    print_vector(vec1, n);
    
    printf("Vector 2:        ");
    print_vector(vec2, n);
    
    printf("Sum of vectors:  ");
    print_vector(sum_vec, n);
    
    printf("Dot product:     %.2lf\n", scalar);
}

int main() {
    task7_6();
    return 0;
}