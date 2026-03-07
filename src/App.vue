<template>
  <div class="test-container">
    <h2>🚀 前后端连通性测试</h2>
    <p>点击下方按钮，向 Spring Boot 发送请求获取数据库数据：</p>

    <button @click="fetchEmployeeData" class="btn">获取ID为1的员工信息</button>

    <div v-if="employeeData" class="result success">
      <h3>🎉 连接成功！后端返回的数据：</h3>
      <pre>{{ employeeData }}</pre>
    </div>

    <div v-if="errorMessage" class="result error">
      <h3>❌ 连接失败：</h3>
      <p>{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import request from '@/utils/request' // 引入我们刚才封装的 Axios 工具

// 定义两个响应式变量，用来存放成功的数据和失败的报错信息
const employeeData = ref(null)
const errorMessage = ref('')

// 点击按钮时触发的方法
const fetchEmployeeData = async () => {
  try {
    // 每次点击先清空上一次的结果
    employeeData.value = null
    errorMessage.value = ''

    // 发送 GET 请求，实际会请求到 http://localhost:8080/employee/1
    const response = await request.get('/employee/1')

    // 把后端返回的数据赋值给变量，页面会自动更新显示
    employeeData.value = response.data
  } catch (error) {
    // 如果报错了（比如后端没启动、代理没配好），捕获错误并显示
    errorMessage.value = error.message
  }
}
</script>

<style scoped>
/* 随便写点样式让它好看一点 */
.test-container {
  padding: 40px;
  font-family: sans-serif;
}
.btn {
  padding: 10px 20px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
.btn:hover {
  background-color: #33a06f;
}
.result {
  margin-top: 20px;
  padding: 15px;
  border-radius: 8px;
}
.success {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}
.error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}
pre {
  background-color: #ffffff;
  padding: 10px;
  border-radius: 4px;
}
</style>
