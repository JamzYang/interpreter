## 一、环境准备
1. 下载并安装VB-CABLE驱动
   - 下载地址：https://vb-audio.com/Cable/
   - 安装后会创建两个虚拟设备：
     * CABLE Input (VB-Audio Virtual Cable)
     * CABLE Output (VB-Audio Virtual Cable)


## 二、基础测试程序
```csharp
// 使用C#和NAudio库编写测试程序
using NAudio.Wave;

public class AudioTest
{
    private IWaveIn waveIn;  // 音频输入
    private IWaveOut waveOut;  // 音频输出
    private WaveFileWriter writer;  // 用于调试

    public void Initialize()
    {
        // 列出所有音频设备
        for (int i = 0; i < WaveIn.DeviceCount; i++)
        {
            var capabilities = WaveIn.GetCapabilities(i);
            Console.WriteLine($"Input Device {i}: {capabilities.ProductName}");
        }

        // 选择VB-CABLE设备
        waveIn = new WaveInEvent
        {
            DeviceNumber = 0, // 需要找到VB-CABLE的设备号
            WaveFormat = new WaveFormat(44100, 1),
            BufferMilliseconds = 50
        };

        waveIn.DataAvailable += WaveIn_DataAvailable;
    }

    private void WaveIn_DataAvailable(object sender, WaveInEventArgs e)
    {
        // 处理捕获的音频数据
        writer?.Write(e.Buffer, 0, e.BytesRecorded);
        Console.WriteLine($"Captured {e.BytesRecorded} bytes");
    }

    public void Start()
    {
        writer = new WaveFileWriter("test.wav", waveIn.WaveFormat);
        waveIn.StartRecording();
    }

    public void Stop()
    {
        waveIn.StopRecording();
        writer?.Dispose();
        writer = null;
    }
}
```

## 三、测试步骤
1. 基础功能测试
   - 验证设备识别
   - 测试音频捕获
   - 检查数据完整性

2. 性能测试
   - 测试延迟
   - 检查CPU占用
   - 验证内存使用

3. 稳定性测试
   - 长时间运行测试
   - 错误处理验证
   - 资源释放检查

## 四、下一步计划
1. 实现双向音频流处理
2. 添加音频格式转换
3. 集成到主程序 