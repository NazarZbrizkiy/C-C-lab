#include <stdio.h>
#include <stdbool.h>
#include <math.h>
#define N 10
bool isPrime(int num) {
    if (num <= 1) return false;
    for (int i = 2; i <= sqrt(num); i++) {
        if (num % i == 0) return false;
    }
    return true;
}
bool isPerfectSquare(int num) {
    int root = (int)sqrt(num);
    return root * root == num;
}
bool isSquareOfPrime(int num) {
    
    if (isPerfectSquare(num)) {
        int root = (int)sqrt(num);
        return isPrime(root);
    }
    return false;
}
int main(){
    int mas[N];
    for (int i = 0; i < N; i++){
        printf("Enter element %d: ", i);
        scanf("%d", &mas[i]);
        if (isPrime(mas[i])) {
            printf("%d is a prime number.\n", mas[i]);
        } else {
            printf("%d is not a prime number.\n", mas[i]);
        }
        if (isSquareOfPrime(mas[i])) {
            printf("%d is a square of a prime number.\n", mas[i]);
        } else {
            printf("%d is not a square of a prime number.\n", mas[i]);
        }
    }
    
}