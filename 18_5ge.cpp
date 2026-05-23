#include <iostream>
#include <stdexcept>

using namespace std;

template <typename T>
class CustomArray {
    T* data;
    int size;

public:
    CustomArray(int s) {
        if (s <= 0) throw invalid_argument("Size must be positive");
        size = s;
        data = new T[size];
    }

    ~CustomArray() {
        delete[] data;
    }

    CustomArray(const CustomArray& other) {
        size = other.size;
        data = new T[size];
        for (int i = 0; i < size; ++i) {
            data[i] = other.data[i];
        }
    }

    CustomArray& operator=(const CustomArray& other) {
        if (this != &other) {
            delete[] data;
            size = other.size;
            data = new T[size];
            for (int i = 0; i < size; ++i) {
                data[i] = other.data[i];
            }
        }
        return *this;
    }

    T& operator[](int index) {
        if (index < 0 || index >= size) throw out_of_range("Index out of bounds");
        return data[index];
    }

    const T& operator[](int index) const {
        if (index < 0 || index >= size) throw out_of_range("Index out of bounds");
        return data[index];
    }

    void print() const {
        for (int i = 0; i < size; ++i) {
            cout << data[i] << " ";
        }
        cout << "\n";
    }

    static void staticInsertionSort(T* arr, int n) {
        for (int i = 1; i < n; ++i) {
            T key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j = j - 1;
            }
            arr[j + 1] = key;
        }
    }

    void insertionSort() {
        staticInsertionSort(data, size);
    }
    
    int getSize() const {
        return size;
    }
};

void task5() {
    try {
        int n;
        cout << "Enter array size: ";
        cin >> n;

        CustomArray<int> arr(n);
        cout << "Enter " << n << " integers:\n";
        for (int i = 0; i < n; ++i) {
            cin >> arr[i];
        }

        cout << "Original array: ";
        arr.print();

        arr.insertionSort();

        cout << "Sorted array (instance method): ";
        arr.print();

        int staticN = 5;
        double staticArr[] = {5.5, 2.2, 9.9, 1.1, 4.4};
        
        cout << "\nOriginal static array: ";
        for (int i = 0; i < staticN; ++i) cout << staticArr[i] << " ";
        cout << "\n";

        CustomArray<double>::staticInsertionSort(staticArr, staticN);

        cout << "Sorted static array (static method): ";
        for (int i = 0; i < staticN; ++i) cout << staticArr[i] << " ";
        cout << "\n";

    } catch (const exception& e) {
        cout << "Error: " << e.what() << "\n";
    }
}

int main() {
    int choice;
    cout << "Select task to run (5, 0 to exit): ";
    while (cin >> choice && choice != 0) {
        if (choice == 5) {
            cout << "\n--- Running Task 5 ---\n";
            task5();
        } else {
            cout << "Invalid choice.\n";
        }
        cout << "\nSelect task to run (5, 0 to exit): ";
    }
    return 0;
}