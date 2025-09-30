// 多层变量遮蔽示例
int a1;
int a3;

int test_func(int a1) {  // 参数遮蔽全局变量
    int a2;

    int a3;

    a3 = 40;
    
    a2 = a1 + 1;
    
    {
      a1 = 20;
      a2 = a1 + 1;
      printf("inner: a1=%d, a2=%d, a3=%d\n", a1, a2, a3);
      {
        a1 = 30;
        a2 = a1 + 1;
        printf("inner: a1=%d, a2=%d, a3=%d\n", a1, a2, a3);
      }
    }
    printf("outer: a1=%d, a2=%d, a3=%d\n", a1, a2, a3);
    
    return a2;
}

int main() {
    int a1;  // 局部变量遮蔽全局变量

    int result1;
    
    a1 = 10;
    
    printf("main: a1=%d\n", a1);
    
    result1 = test_func(5);
    
    printf("Results: result1=%d\n", result1);
    printf("a1=%d\n", a1);
    
    return 0;
}
