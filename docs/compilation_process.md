# CPC编译器完整编译过程分析

## 📊 实际地址说明

**重要说明**：本文档中的地址基于实际运行 `./cpc example/test.c` 生成的 `assemble` 文件：

- **代码段地址**：基于 `assemble` 文件中的实际地址
  - **test_func 函数地址**：`5369790472` (第1行)
  - **main 函数地址**：`5369791360` (第80行)  
- **数据段地址**：使用 `0x2000` 作为起始地址（示例假设）
  - **全局变量 a1**：`0x2000`
  - **全局变量 a3**：`0x2008`

**地址分配机制**：
1. 代码段地址由 `malloc()` 动态分配，记录在 `assemble` 文件中
2. 数据段地址使用 `0x2000` 作为示例起始地址
3. 局部变量通过栈偏移访问 (`LEA -1`, `LEA -2` 等)
4. 每次运行代码段地址可能不同，但相对关系保持一致

---

## 🎯 编译过程概述

CPC编译器的核心过程就是：**词法分析 → 构建符号表 → 同时填充数据段和代码段**

## 📊 编译过程的三个阶段

### 阶段1：词法分析（Lexical Analysis）
### 阶段2：符号表构建（Symbol Table Construction）
### 阶段3：代码生成（Code Generation）

---

## 🔍 阶段1：词法分析（tokenize函数）

### 📝 词法分析的作用
- **识别标识符**：变量名、函数名、关键字
- **识别数字**：十进制、十六进制、八进制
- **识别字符串和字符**：字符串字面量、字符字面量
- **识别操作符**：算术、逻辑、比较操作符
- **跳过注释和宏**：预处理指令

### 🔄 词法分析流程

```c
void tokenize() {
    char* ch_ptr;
    while((token = *src++)) {
        if (token == '\n') line++;
        // skip marco
        else if (token == '#') while (*src != 0 && *src != '\n') src++;
        // handle symbol
        else if ((token >= 'a' && token <= 'z') || (token >= 'A' && token <= 'Z') || (token == '_')) {
            ch_ptr = src - 1;
            while ((*src >= 'a' && *src <= 'z') || (*src >= 'A' && *src <= 'Z')
                    || (*src >= '0' && *src <= '9') || (*src == '_'))
                token = token * 147 + *src++;
            token = (token << 6) + (src - ch_ptr);
            symbol_ptr = symbol_table;
            // search same symbol in table
            while(symbol_ptr[Token]) {
                if (token == symbol_ptr[Hash] && !memcmp((char*)symbol_ptr[Name], ch_ptr, src - ch_ptr)) {
                    token = symbol_ptr[Token];
                    return;
                }
                symbol_ptr = symbol_ptr + SymSize;
            }
            // add new symbol
            symbol_ptr[Name] = (int)ch_ptr;
            symbol_ptr[Hash] = token;
            token = symbol_ptr[Token] = Id;
            return;
        }
        // handle number
        else if (token >= '0' && token <= '9') {
            // DEC, ch_ptr with 1 - 9
            if ((token_val = token - '0'))
                while (*src >= '0' && *src <= '9') token_val = token_val * 10 + *src++ - '0';
            //HEX, ch_ptr with 0x
            else if (*src == 'x' || *src == 'X')
                while ((token = *++src) && ((token >= '0' && token <= '9') || (token >= 'a' && token <= 'f')
                        || (token >= 'A' && token <= 'F')))
                    token_val = token_val * 16 + (token & 0xF) + (token >= 'A' ? 9 : 0);
            // OCT, start with 0
            else while (*src >= '0' && *src <= '7') token_val = token_val * 8 + *src++ - '0';
            token = Num;
            return;
        }
        // handle string & char
        else if (token == '"' || token == '\'') {
            // ... 字符串和字符处理
        }
        // ... 其他操作符处理
    }
}
```

### 🎯 词法分析的关键特点

1. **哈希计算**：使用 `token * 147 + *src++` 计算标识符哈希
2. **符号查找**：在符号表中查找已存在的符号
3. **新符号添加**：将新标识符添加到符号表
4. **数字解析**：支持十进制、十六进制、八进制

---

## 🏗️ 阶段2：符号表构建（Symbol Table Construction）

### 📝 符号表的作用
- **存储符号信息**：名称、类型、作用域、值
- **管理作用域**：处理变量遮蔽
- **类型检查**：确保类型正确性
- **代码生成支持**：为代码生成提供信息

### 🔄 符号表构建流程

#### 2.1 关键字初始化（keyword函数）

```c
void keyword() {
    int i;
    src = "char int enum if else return sizeof while "
        "open read close printf malloc free memset memcmp exit void main";
    // add keywords to symbol table
    i = Char; while (i <= While) {tokenize(); symbol_ptr[Token] = i++;}
    // add Native CALL to symbol table
    i = OPEN; while (i <= EXIT) {
        tokenize();
        symbol_ptr[Class] = Sys;
        symbol_ptr[Type] = INT;
        symbol_ptr[Value] = i++;
    }
    tokenize(); symbol_ptr[Token] = Char; // handle void type
    tokenize(); main_ptr = symbol_ptr; // keep track of main
    src = src_dump;
}
```

**关键字初始化结果**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 0 | Char | hash("char") | "char" | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | Int | hash("int") | "int" | 0 | 0 | 0 | 0 | 0 | 0 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| 8 | OPEN | hash("open") | "open" | Sys | INT | OPEN | 0 | 0 | 0 |
| 9 | READ | hash("read") | "read" | Sys | INT | READ | 0 | 0 | 0 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

#### 2.2 全局变量定义

```c
// 全局变量定义
int global_var;
char global_char;
```

**符号表更新**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 19 | Id | hash("global_var") | "global_var" | Glo | INT | 0x2000 | 0 | 0 | 0 |
| 20 | Id | hash("global_char") | "global_char" | Glo | CHAR | 0x2008 | 0 | 0 | 0 |

**关键操作**：
```c
symbol_ptr[Class] = Glo;
symbol_ptr[Value] = (int)data;  // 数据段地址
data = data + 8; // 为下一个变量预留空间
```

#### 2.3 函数定义

```c
int outer_func(int global_var) {
    // 函数体
}
```

**符号表更新**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 21 | Id | hash("outer_func") | "outer_func" | Fun | INT | 0x1100 | 0 | 0 | 0 |

**关键操作**：
```c
symbol_ptr[Class] = Fun;
symbol_ptr[Value] = (int)(code + 1);  // 代码段地址
```

#### 2.4 局部变量定义

```c
int local_var;
int global_char;  // 局部变量遮蔽全局变量
```

**符号表更新**：
| 索引 | Token | Hash | Name | Class | Type | Value | GClass | GType | GValue |
|------|-------|------|------|-------|------|-------|--------|-------|--------|
| 19 | Id | hash("global_var") | "global_var" | Loc | INT | 0 | Glo | INT | 0x2000 |
| 20 | Id | hash("global_char") | "global_char" | Loc | CHAR | 2 | Glo | CHAR | 0x2008 |
| 22 | Id | hash("local_var") | "local_var" | Loc | INT | 1 | 0 | 0 | 0 |

**关键操作**：
```c
hide_global();  // 备份全局变量信息
symbol_ptr[Class] = Loc;
symbol_ptr[Value] = ++i;  // 栈帧偏移
```

---

## 🎯 阶段3：代码生成（Code Generation）

### 📝 代码生成的作用
- **生成VM指令**：将语法树转换为VM指令
- **填充代码段**：将指令写入代码段
- **填充数据段**：将全局变量写入数据段
- **生成栈帧**：为局部变量分配栈空间

### 🔄 代码生成流程

#### 3.1 函数调用代码生成

```c
// 函数调用：outer_func(5)
*++code = CALL; *++code = (int)(symbol_ptr[Value]);  // CALL 0x1100
*++code = DARG; *++code = 1;  // DARG 1
```

**生成的指令**：
```
CALL 0x1100  // 调用outer_func函数
DARG 1       // 清理1个参数
```

#### 3.2 局部变量访问代码生成

```c
// 局部变量访问：local_var
if (tmp_ptr[Class] == Loc) {
    *++code = LEA; 
    *++code = ibp - tmp_ptr[Value];  // LEA -1
}
```

**生成的指令**：
```
LEA -1  // 加载local_var的地址
```

#### 3.3 全局变量访问代码生成

```c
// 全局变量访问：global_var
else if (tmp_ptr[Class] == Glo) {
    *++code = IMM; 
    *++code = tmp_ptr[Value];  // IMM 0x2000
}
```

**生成的指令**：
```
IMM 0x2000  // 加载global_var的地址
```

#### 3.4 栈帧创建代码生成

```c
// 栈帧创建
*++code = NVAR;
*++code = i - ibp;  // 栈帧大小
```

**生成的指令**：
```
NVAR 2  // 创建大小为2的栈帧
```

---

## 📊 完整编译过程示例

### 示例代码
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

### 编译过程

#### 步骤1：关键字初始化
```
符号表：[关键字] + [系统调用]
```

#### 步骤2：全局变量定义
```
符号表：[关键字] + [系统调用] + [a1, a3]
数据段：[a1: 0x2000] + [a3: 0x2008]
```

#### 步骤3：test_func函数定义
```
符号表：[关键字] + [系统调用] + [a1, a3] + [test_func]
代码段：[test_func: 0x1100]
```

#### 步骤4：test_func局部变量定义
```
符号表：[关键字] + [系统调用] + [a1(遮蔽), a3(遮蔽)] + [test_func] + [a2]
```

#### 步骤5：test_func代码生成
```
代码段：[test_func: 0x1100] + [NVAR 2, IMM 40, SI, LEA -1, LI, ADD, SI, ...]
```

#### 步骤6：main函数定义
```
符号表：[关键字] + [系统调用] + [a1, a3] + [test_func] + [main]
代码段：[test_func: 0x1100] + [main: 0x1200]
```

#### 步骤7：main局部变量定义
```
符号表：[关键字] + [系统调用] + [a1(遮蔽), a3] + [test_func] + [main] + [result1]
```

#### 步骤8：main代码生成
```
代码段：[test_func: 0x1100] + [main: 0x1200] + [NVAR 2, IMM 10, SI, LEA -2, PUSH, IMM 5, PUSH, CALL 0x1100, DARG 1, SI, ...]
```

---

## 🎯 编译过程的关键特点

### 1. 同步进行
- **词法分析**：识别符号
- **符号表构建**：存储符号信息
- **代码生成**：生成指令

### 2. 内存管理
- **数据段**：存储全局变量
- **代码段**：存储VM指令
- **栈段**：运行时分配

### 3. 作用域管理
- **hide_global()**：备份全局变量信息
- **recover_global()**：恢复全局变量信息

### 4. 地址计算
- **全局变量**：数据段地址
- **函数**：代码段地址
- **局部变量**：栈帧偏移

### 5. 变量遮蔽的本质
- **代码段**：存储指令，不会因为变量遮蔽而改变
- **数据段**：存储全局变量，会被局部变量遮蔽
- **栈段**：存储局部变量，通过栈偏移访问
- **符号表**：决定访问哪个内存段（数据段 vs 栈段）

**变量遮蔽的内存访问机制**：
```
没有遮蔽时：
a1 → 符号表 → Value = 0x2000 → 访问数据段

有遮蔽时：
a1 → 符号表 → Value = 0 (栈偏移) → 访问栈段
```

**关键理解**：
- 变量遮蔽针对的是**数据段**，和**代码段**无关
- 代码段只是根据符号表的信息来决定访问哪个内存位置
- 局部变量通过栈偏移访问，全局变量通过数据段地址访问

**内存访问机制总结**：
- **全局变量（数据段）**：存储在数据段，通过 `IMM` 指令直接加载地址访问
- **局部变量（栈段）**：存储在栈段，通过 `LEA` 指令计算栈偏移访问
- **代码段指令**：决定访问哪个内存位置（数据段 vs 栈段）
- **符号表**：提供访问信息（地址 vs 偏移）

**内存访问流程**：
```
变量访问 → 符号表查找 → 根据Class决定访问方式
├── Class = Glo → IMM + 数据段地址
└── Class = Loc → LEA + 栈偏移
```

**关键特点**：
- 除了全局的数据段变量，栈内的数据访问都是通过代码段的指令来操作的
- `IMM` 指令不仅加载数据段地址，还加载常量值、字符串地址、函数地址等
- `LEA` 指令专门用于计算栈偏移，访问局部变量

---

## 📈 总结

**CPC编译器的核心过程**：

1. **词法分析**：识别标识符、数字、操作符
2. **符号表构建**：存储符号信息，管理作用域
3. **代码生成**：生成VM指令，填充代码段和数据段

**关键设计**：
- **符号表**：编译时的信息中心
- **数据段**：全局变量的存储空间
- **代码段**：VM指令的存储空间
- **栈段**：局部变量的运行时空间

**编译结果**：
- **符号表**：包含所有符号信息
- **数据段**：包含全局变量
- **代码段**：包含VM指令
- **栈段**：运行时动态分配

这种设计使得编译器能够高效地将C代码转换为可执行的VM指令！
