# 完整的多层变量遮蔽符号表分析（包含关键字和系统调用）

## 📊 实际地址说明

**重要说明**：本文档中的地址基于实际运行 `./cpc example/test.c` 生成的 `assemble` 文件：

- **代码段地址**：基于 `assemble` 文件中的实际地址
  - **test_func 函数地址**：`5369790472` (第1行)
  - **main 函数地址**：`5369791360` (第80行)  
- **数据段地址**：使用 `0x2000` 作为起始地址（示例假设）
  - **全局变量 a1**：`0x2000`
  - **全局变量 a3**：`0x2008`
- **字符串常量地址**：`5370839056` 开始 (数据段中的字符串)

**地址分配机制**：
1. 代码段地址由 `malloc()` 动态分配，记录在 `assemble` 文件中
2. 数据段地址使用 `0x2000` 作为示例起始地址
3. 局部变量通过栈偏移访问 (`LEA -1`, `LEA -2` 等)
4. 每次运行代码段地址可能不同，但相对关系保持一致

---

## 示例代码

```c
// 多层变量遮蔽示例
int a1;
int a3;

int test_func(int a1) {  // 参数遮蔽全局变量
    int a2;
    int a3;  // 局部变量遮蔽全局变量
    
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
```

## 完整的符号表变化过程

### 阶段1：关键字初始化（keyword()函数调用）

**关键字字符串**：
```
"char int enum if else return sizeof while open read close printf malloc free memset memcmp exit void main"
```

**符号表状态**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 0 | Char | hash("char") | "char" | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | Int | hash("int") | "int" | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | Enum | hash("enum") | "enum" | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | If | hash("if") | "if" | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | Else | hash("else") | "else" | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | Return | hash("return") | "return" | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | Sizeof | hash("sizeof") | "sizeof" | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | While | hash("while") | "while" | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | OPEN | hash("open") | "open" | Sys | INT | OPEN | 0 | 0 | 0 |
| 9 | READ | hash("read") | "read" | Sys | INT | READ | 0 | 0 | 0 |
| 10 | CLOS | hash("close") | "close" | Sys | INT | CLOS | 0 | 0 | 0 |
| 11 | PRTF | hash("printf") | "printf" | Sys | INT | PRTF | 0 | 0 | 0 |
| 12 | MALC | hash("malloc") | "malloc" | Sys | INT | MALC | 0 | 0 | 0 |
| 13 | FREE | hash("free") | "free" | Sys | INT | FREE | 0 | 0 | 0 |
| 14 | MSET | hash("memset") | "memset" | Sys | INT | MSET | 0 | 0 | 0 |
| 15 | MCMP | hash("memcmp") | "memcmp" | Sys | INT | MCMP | 0 | 0 | 0 |
| 16 | EXIT | hash("exit") | "exit" | Sys | INT | EXIT | 0 | 0 | 0 |
| 17 | Char | hash("void") | "void" | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 | Id | hash("main") | "main" | 0 | 0 | 0 | 0 | 0 | 0 |

**关键变化**：
- 关键字：`char`, `int`, `enum`, `if`, `else`, `return`, `sizeof`, `while` 的 `Token` 字段设置为对应的枚举值
- 系统调用：`open`, `read`, `close`, `printf`, `malloc`, `free`, `memset`, `memcmp`, `exit` 的 `Class` 设置为 `Sys`，`Type` 设置为 `INT`，`Value` 设置为对应的系统调用编号
- `void` 的 `Token` 设置为 `Char`（类型关键字）
- `main` 的 `Token` 设置为 `Id`，`main_ptr` 指向这个符号

### 阶段2：全局变量定义

**全局变量定义**：
```c
int a1;
int a3;
```

**符号表状态**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 0 | Char | hash("char") | "char" | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | Int | hash("int") | "int" | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | Enum | hash("enum") | "enum" | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | If | hash("if") | "if" | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | Else | hash("else") | "else" | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | Return | hash("return") | "return" | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | Sizeof | hash("sizeof") | "sizeof" | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | While | hash("while") | "while" | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | OPEN | hash("open") | "open" | Sys | INT | OPEN | 0 | 0 | 0 |
| 9 | READ | hash("read") | "read" | Sys | INT | READ | 0 | 0 | 0 |
| 10 | CLOS | hash("close") | "close" | Sys | INT | CLOS | 0 | 0 | 0 |
| 11 | PRTF | hash("printf") | "printf" | Sys | INT | PRTF | 0 | 0 | 0 |
| 12 | MALC | hash("malloc") | "malloc" | Sys | INT | MALC | 0 | 0 | 0 |
| 13 | FREE | hash("free") | "free" | Sys | INT | FREE | 0 | 0 | 0 |
| 14 | MSET | hash("memset") | "memset" | Sys | INT | MSET | 0 | 0 | 0 |
| 15 | MCMP | hash("memcmp") | "memcmp" | Sys | INT | MCMP | 0 | 0 | 0 |
| 16 | EXIT | hash("exit") | "exit" | Sys | INT | EXIT | 0 | 0 | 0 |
| 17 | Char | hash("void") | "void" | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 | Id | hash("main") | "main" | 0 | 0 | 0 | 0 | 0 | 0 |
| 19 | Id | hash("a1") | "a1" | Glo | INT | 0x2000 | 0 | 0 | 0 |
| 20 | Id | hash("a3") | "a3" | Glo | INT | 0x2008 | 0 | 0 | 0 |

**关键变化**：
- `a1` 的 `Class` 设置为 `Glo`，`Type` 设置为 `INT`，`Value` 设置为 `0x2000`（数据段地址）
- `a3` 的 `Class` 设置为 `Glo`，`Type` 设置为 `INT`，`Value` 设置为 `0x2008`（数据段地址）

### 阶段3：test_func 函数定义

**函数定义**：
```c
int test_func(int a1) {  // 参数遮蔽全局变量
```

**遮蔽过程**：
1. 调用 `hide_global()` 备份全局变量信息
2. 参数 `a1` 遮蔽全局变量 `a1`

**符号表状态**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 0 | Char | hash("char") | "char" | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | Int | hash("int") | "int" | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | Enum | hash("enum") | "enum" | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | If | hash("if") | "if" | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | Else | hash("else") | "else" | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | Return | hash("return") | "return" | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | Sizeof | hash("sizeof") | "sizeof" | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | While | hash("while") | "while" | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | OPEN | hash("open") | "open" | Sys | INT | OPEN | 0 | 0 | 0 |
| 9 | READ | hash("read") | "read" | Sys | INT | READ | 0 | 0 | 0 |
| 10 | CLOS | hash("close") | "close" | Sys | INT | CLOS | 0 | 0 | 0 |
| 11 | PRTF | hash("printf") | "printf" | Sys | INT | PRTF | 0 | 0 | 0 |
| 12 | MALC | hash("malloc") | "malloc" | Sys | INT | MALC | 0 | 0 | 0 |
| 13 | FREE | hash("free") | "free" | Sys | INT | FREE | 0 | 0 | 0 |
| 14 | MSET | hash("memset") | "memset" | Sys | INT | MSET | 0 | 0 | 0 |
| 15 | MCMP | hash("memcmp") | "memcmp" | Sys | INT | MCMP | 0 | 0 | 0 |
| 16 | EXIT | hash("exit") | "exit" | Sys | INT | EXIT | 0 | 0 | 0 |
| 17 | Char | hash("void") | "void" | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 | Id | hash("main") | "main" | 0 | 0 | 0 | 0 | 0 | 0 |
| 19 | Id | hash("a1") | "a1" | Loc | INT | 0 | Glo | INT | 0x2000 |
| 20 | Id | hash("a3") | "a3" | Glo | INT | 0x2008 | 0 | 0 | 0 |
| 21 | Id | hash("test_func") | "test_func" | Fun | INT | 5369790472 | 0 | 0 | 0 |

**关键变化**：
- `a1` 的 `Class` 从 `Glo` 变为 `Loc`
- `a1` 的 `Value` 从 `0x2000` 变为 `0`（参数偏移）
- `a1` 的 `GClass` 备份为 `Glo`
- `a1` 的 `GType` 备份为 `INT`
- `a1` 的 `GValue` 备份为 `0x2000`
- `test_func` 的 `Class` 设置为 `Fun`，`Type` 设置为 `INT`，`Value` 设置为 `5369790472`（代码段地址）

### 阶段4：test_func 局部变量定义

**局部变量定义**：
```c
int a2;
int a3;  // 局部变量遮蔽全局变量
```

**遮蔽过程**：
1. `a2` 作为新的局部变量
2. `a3` 遮蔽全局变量 `a3`

**符号表状态**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 0 | Char | hash("char") | "char" | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | Int | hash("int") | "int" | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | Enum | hash("enum") | "enum" | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | If | hash("if") | "if" | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | Else | hash("else") | "else" | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | Return | hash("return") | "return" | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | Sizeof | hash("sizeof") | "sizeof" | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | While | hash("while") | "while" | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | OPEN | hash("open") | "open" | Sys | INT | OPEN | 0 | 0 | 0 |
| 9 | READ | hash("read") | "read" | Sys | INT | READ | 0 | 0 | 0 |
| 10 | CLOS | hash("close") | "close" | Sys | INT | CLOS | 0 | 0 | 0 |
| 11 | PRTF | hash("printf") | "printf" | Sys | INT | PRTF | 0 | 0 | 0 |
| 12 | MALC | hash("malloc") | "malloc" | Sys | INT | MALC | 0 | 0 | 0 |
| 13 | FREE | hash("free") | "free" | Sys | INT | FREE | 0 | 0 | 0 |
| 14 | MSET | hash("memset") | "memset" | Sys | INT | MSET | 0 | 0 | 0 |
| 15 | MCMP | hash("memcmp") | "memcmp" | Sys | INT | MCMP | 0 | 0 | 0 |
| 16 | EXIT | hash("exit") | "exit" | Sys | INT | EXIT | 0 | 0 | 0 |
| 17 | Char | hash("void") | "void" | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 | Id | hash("main") | "main" | 0 | 0 | 0 | 0 | 0 | 0 |
| 19 | Id | hash("a1") | "a1" | Loc | INT | 0 | Glo | INT | 0x2000 |
| 20 | Id | hash("a3") | "a3" | Loc | INT | 2 | Glo | INT | 0x2000+8 |
| 21 | Id | hash("test_func") | "test_func" | Fun | INT | 5906661384 | 0 | 0 | 0 |
| 22 | Id | hash("a2") | "a2" | Loc | INT | 1 | 0 | 0 | 0 |

**关键变化**：
- `a3` 的 `Class` 从 `Glo` 变为 `Loc`
- `a3` 的 `Value` 从 `0x2000+8` 变为 `2`（局部变量偏移）
- `a3` 的 `GClass` 备份为 `Glo`
- `a3` 的 `GType` 备份为 `INT`
- `a3` 的 `GValue` 备份为 `0x2000+8`
- `a2` 作为新的局部变量添加

### 阶段5：test_func 函数结束

**函数结束**：
```c
return a2;
}
```

**恢复过程**：
1. 调用 `recover_global()` 恢复全局变量信息
2. 局部变量信息被清除

**符号表状态**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 0 | Char | hash("char") | "char" | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | Int | hash("int") | "int" | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | Enum | hash("enum") | "enum" | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | If | hash("if") | "if" | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | Else | hash("else") | "else" | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | Return | hash("return") | "return" | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | Sizeof | hash("sizeof") | "sizeof" | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | While | hash("while") | "while" | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | OPEN | hash("open") | "open" | Sys | INT | OPEN | 0 | 0 | 0 |
| 9 | READ | hash("read") | "read" | Sys | INT | READ | 0 | 0 | 0 |
| 10 | CLOS | hash("close") | "close" | Sys | INT | CLOS | 0 | 0 | 0 |
| 11 | PRTF | hash("printf") | "printf" | Sys | INT | PRTF | 0 | 0 | 0 |
| 12 | MALC | hash("malloc") | "malloc" | Sys | INT | MALC | 0 | 0 | 0 |
| 13 | FREE | hash("free") | "free" | Sys | INT | FREE | 0 | 0 | 0 |
| 14 | MSET | hash("memset") | "memset" | Sys | INT | MSET | 0 | 0 | 0 |
| 15 | MCMP | hash("memcmp") | "memcmp" | Sys | INT | MCMP | 0 | 0 | 0 |
| 16 | EXIT | hash("exit") | "exit" | Sys | INT | EXIT | 0 | 0 | 0 |
| 17 | Char | hash("void") | "void" | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 | Id | hash("main") | "main" | 0 | 0 | 0 | 0 | 0 | 0 |
| 19 | Id | hash("a1") | "a1" | Glo | INT | 0x2000 | 0 | 0 | 0 |
| 20 | Id | hash("a3") | "a3" | Glo | INT | 0x2008 | 0 | 0 | 0 |
| 21 | Id | hash("test_func") | "test_func" | Fun | INT | 5369790472 | 0 | 0 | 0 |

**关键变化**：
- `a1` 的 `Class` 从 `Loc` 恢复为 `Glo`
- `a1` 的 `Value` 从 `0` 恢复为 `0x2000`
- `a3` 的 `Class` 从 `Loc` 恢复为 `Glo`
- `a3` 的 `Value` 从 `2` 恢复为 `0x2008`
- `a2` 被清除（局部变量作用域结束）

### 阶段6：main 函数定义

**函数定义**：
```c
int main() {
```

**符号表状态**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 0 | Char | hash("char") | "char" | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | Int | hash("int") | "int" | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | Enum | hash("enum") | "enum" | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | If | hash("if") | "if" | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | Else | hash("else") | "else" | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | Return | hash("return") | "return" | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | Sizeof | hash("sizeof") | "sizeof" | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | While | hash("while") | "while" | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | OPEN | hash("open") | "open" | Sys | INT | OPEN | 0 | 0 | 0 |
| 9 | READ | hash("read") | "read" | Sys | INT | READ | 0 | 0 | 0 |
| 10 | CLOS | hash("close") | "close" | Sys | INT | CLOS | 0 | 0 | 0 |
| 11 | PRTF | hash("printf") | "printf" | Sys | INT | PRTF | 0 | 0 | 0 |
| 12 | MALC | hash("malloc") | "malloc" | Sys | INT | MALC | 0 | 0 | 0 |
| 13 | FREE | hash("free") | "free" | Sys | INT | FREE | 0 | 0 | 0 |
| 14 | MSET | hash("memset") | "memset" | Sys | INT | MSET | 0 | 0 | 0 |
| 15 | MCMP | hash("memcmp") | "memcmp" | Sys | INT | MCMP | 0 | 0 | 0 |
| 16 | EXIT | hash("exit") | "exit" | Sys | INT | EXIT | 0 | 0 | 0 |
| 17 | Char | hash("void") | "void" | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 | Id | hash("main") | "main" | Fun | INT | 5369791360 | 0 | 0 | 0 |
| 19 | Id | hash("a1") | "a1" | Glo | INT | 0x2000 | 0 | 0 | 0 |
| 20 | Id | hash("a3") | "a3" | Glo | INT | 0x2008 | 0 | 0 | 0 |
| 21 | Id | hash("test_func") | "test_func" | Fun | INT | 5369790472 | 0 | 0 | 0 |

**关键变化**：
- `main` 的 `Class` 从 `0` 设置为 `Fun`，`Type` 设置为 `INT`，`Value` 设置为 `5369791360`（代码段地址）

### 阶段7：main 函数局部变量定义

**局部变量定义**：
```c
int a1;  // 局部变量遮蔽全局变量
int result1;
```

**遮蔽过程**：
1. 调用 `hide_global()` 备份全局变量信息
2. `a1` 遮蔽全局变量 `a1`

**符号表状态**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 0 | Char | hash("char") | "char" | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | Int | hash("int") | "int" | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | Enum | hash("enum") | "enum" | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | If | hash("if") | "if" | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | Else | hash("else") | "else" | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | Return | hash("return") | "return" | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | Sizeof | hash("sizeof") | "sizeof" | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | While | hash("while") | "while" | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | OPEN | hash("open") | "open" | Sys | INT | OPEN | 0 | 0 | 0 |
| 9 | READ | hash("read") | "read" | Sys | INT | READ | 0 | 0 | 0 |
| 10 | CLOS | hash("close") | "close" | Sys | INT | CLOS | 0 | 0 | 0 |
| 11 | PRTF | hash("printf") | "printf" | Sys | INT | PRTF | 0 | 0 | 0 |
| 12 | MALC | hash("malloc") | "malloc" | Sys | INT | MALC | 0 | 0 | 0 |
| 13 | FREE | hash("free") | "free" | Sys | INT | FREE | 0 | 0 | 0 |
| 14 | MSET | hash("memset") | "memset" | Sys | INT | MSET | 0 | 0 | 0 |
| 15 | MCMP | hash("memcmp") | "memcmp" | Sys | INT | MCMP | 0 | 0 | 0 |
| 16 | EXIT | hash("exit") | "exit" | Sys | INT | EXIT | 0 | 0 | 0 |
| 17 | Char | hash("void") | "void" | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 | Id | hash("main") | "main" | Fun | INT | 5369791360 | 0 | 0 | 0 |
| 19 | Id | hash("a1") | "a1" | Loc | INT | 0 | Glo | INT | 0x2000 |
| 20 | Id | hash("a3") | "a3" | Glo | INT | 0x2008 | 0 | 0 | 0 |
| 21 | Id | hash("test_func") | "test_func" | Fun | INT | 5369790472 | 0 | 0 | 0 |
| 22 | Id | hash("result1") | "result1" | Loc | INT | 1 | 0 | 0 | 0 |

**关键变化**：
- `a1` 的 `Class` 从 `Glo` 变为 `Loc`
- `a1` 的 `Value` 从 `0x2000` 变为 `0`（局部变量偏移）
- `a1` 的 `GClass` 备份为 `Glo`
- `a1` 的 `GType` 备份为 `INT`
- `a1` 的 `GValue` 备份为 `0x2000`
- `result1` 作为新的局部变量添加

### 阶段8：main 函数结束（最终状态）

**函数结束**：
```c
return 0;
}
```

**恢复过程**：
1. 调用 `recover_global()` 恢复全局变量信息
2. 局部变量信息被清除

**最终符号表状态**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 0 | Char | hash("char") | "char" | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | Int | hash("int") | "int" | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | Enum | hash("enum") | "enum" | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | If | hash("if") | "if" | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | Else | hash("else") | "else" | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | Return | hash("return") | "return" | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | Sizeof | hash("sizeof") | "sizeof" | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | While | hash("while") | "while" | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | OPEN | hash("open") | "open" | Sys | INT | OPEN | 0 | 0 | 0 |
| 9 | READ | hash("read") | "read" | Sys | INT | READ | 0 | 0 | 0 |
| 10 | CLOS | hash("close") | "close" | Sys | INT | CLOS | 0 | 0 | 0 |
| 11 | PRTF | hash("printf") | "printf" | Sys | INT | PRTF | 0 | 0 | 0 |
| 12 | MALC | hash("malloc") | "malloc" | Sys | INT | MALC | 0 | 0 | 0 |
| 13 | FREE | hash("free") | "free" | Sys | INT | FREE | 0 | 0 | 0 |
| 14 | MSET | hash("memset") | "memset" | Sys | INT | MSET | 0 | 0 | 0 |
| 15 | MCMP | hash("memcmp") | "memcmp" | Sys | INT | MCMP | 0 | 0 | 0 |
| 16 | EXIT | hash("exit") | "exit" | Sys | INT | EXIT | 0 | 0 | 0 |
| 17 | Char | hash("void") | "void" | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 | Id | hash("main") | "main" | Fun | INT | 5369791360 | 0 | 0 | 0 |
| 19 | Id | hash("a1") | "a1" | Glo | INT | 0x2000 | 0 | 0 | 0 |
| 20 | Id | hash("a3") | "a3" | Glo | INT | 0x2008 | 0 | 0 | 0 |
| 21 | Id | hash("test_func") | "test_func" | Fun | INT | 5369790472 | 0 | 0 | 0 |

## 符号表字段详解

### 关键字字段
- **Token**: 关键字的枚举值（Char, Int, Enum, If, Else, Return, Sizeof, While）
- **Hash**: 关键字的哈希值
- **Name**: 关键字的字符串
- **Class**: 0（关键字没有分类）
- **Type**: 0（关键字没有类型）
- **Value**: 0（关键字没有值）

### 系统调用字段
- **Token**: 系统调用的枚举值（OPEN, READ, CLOS, PRTF, MALC, FREE, MSET, MCMP, EXIT）
- **Hash**: 系统调用的哈希值
- **Name**: 系统调用的字符串
- **Class**: Sys（系统调用分类）
- **Type**: INT（系统调用返回类型）
- **Value**: 系统调用的编号（OPEN=26, READ=27, CLOS=28, PRTF=29, MALC=30, FREE=31, MSET=32, MCMP=33, EXIT=34）

### 函数字段
- **Token**: Id（标识符）
- **Hash**: 函数名的哈希值
- **Name**: 函数名的字符串
- **Class**: Fun（函数分类）
- **Type**: INT（函数返回类型）
- **Value**: 函数在代码段中的地址

### 全局变量字段
- **Token**: Id（标识符）
- **Hash**: 变量名的哈希值
- **Name**: 变量名的字符串
- **Class**: Glo（全局变量分类）
- **Type**: INT/CHAR（变量类型）
- **Value**: 变量在数据段中的地址

### 局部变量字段
- **Token**: Id（标识符）
- **Hash**: 变量名的哈希值
- **Name**: 变量名的字符串
- **Class**: Loc（局部变量分类）
- **Type**: INT/CHAR（变量类型）
- **Value**: 变量在栈帧中的偏移

## 总结

**完整符号表包含**：
1. **关键字**：char, int, enum, if, else, return, sizeof, while, void
2. **系统调用**：open, read, close, printf, malloc, free, memset, memcmp, exit
3. **函数**：main, test_func
4. **全局变量**：a1, a3
5. **局部变量**：a2, result1（在函数作用域内）

**遮蔽机制**：
- 通过 `hide_global()` 和 `recover_global()` 实现变量遮蔽
- 使用 `GClass`、`GType`、`GValue` 字段备份全局变量信息
- 每个函数作用域都有独立的变量遮蔽

**运行结果**：
```
main: a1=10
inner: a1=20, a2=21, a3=40
inner: a1=30, a2=31, a3=40
outer: a1=30, a2=31, a3=40
Results: result1=31
a1=10
```

这种设计使得编译器能够正确处理复杂的变量遮蔽情况，确保每个作用域中的变量访问都是正确的！
