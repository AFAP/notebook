# 【Android BLE】蓝牙「防丢器」的相关知识点（一）：扫描并识别设备

* [蓝牙「防丢器」的相关知识点（一）：扫描并识别设备](./ble-tether-1)
* [蓝牙「防丢器」的相关知识点（二）：连接设备并检测连接状态](./ble-tether-2)
* [蓝牙「防丢器」的相关知识点（三）：手机与设备之间指令传输](./ble-tether-3)

## 1.准备知识：
 * BLE：**[Bluetooth Low Energy](http://baike.baidu.com/item/%E8%93%9D%E7%89%99%E4%BD%8E%E8%83%BD%E8%80%97?fromtitle=BLE&type=syn)**

* Github上的库：**[Bluetooth-LE-Library---Android](https://github.com/alt236/Bluetooth-LE-Library---Android)**（虽然没有引入，但是他这个demo里有另外几个类写的很好，可直接用）

* 其他介绍BLE原理和工作机制的文章（本文主要从代码角度入手）

* **应用简要逻辑介绍：** a.扫描并筛选出特定的设备，不是所有蓝牙设备都展示，只显示自家的；b.连接并写入认证信息到ble设备,该认证视定制情况，实现设备绑定；c.定时检测已绑定设备连接状态，未连接的由应用发起主动连接；d.监听蓝牙设备状态，比如设备发过来的指令、断开事件、信号强度；e.根据设备状态进行对应提醒，如断开报警，强度弱时提示距离偏大，接收到ble设备的单击事件时执行拍照（这里其实还充当了自拍器按键，但是我并没有找到直接控制系统相机快门的方法，采用的是自己搞了一个拍照界面⊙﹏⊙‖∣，有人会的话，请留言，万分感谢），接收到双击事件时手机报警（相当于寻找一时不知道丢到哪里的手机）；f.设备以及应用的一些设置，如勿扰区域、勿扰时段、记录设备定位信息等；g.最后还有一个设备升级，可自行参考CRS相关support文档。

## 2.权限申请以及最低API设置
这一步是很容易被忽略但又非常关键的，被这个坑到过(┬＿┬)
1. 在`AndroidManifest.xml`主配置文件里添加：


```xml
<!-- 蓝牙相关 -->
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>

<uses-feature
	android:name="android.hardware.bluetooth_le"
	android:required="true"/>
```
2. 在`build.gradle`里如下设置：


```js
defaultConfig {
	applicationId "com.powerstick.beaglepro"
	minSdkVersion 18
	targetSdkVersion 19
	versionCode 8
	versionName "1.0.8"
}
```
## 3.初始化蓝牙扫描相关类并扫描、解析、展示（用到android.bluetooth.*）
1.`BluetoothLeScanner.java`如下

```java
import android.bluetooth.BluetoothAdapter;
import android.os.Handler;

import com.tencent.bugly.crashreport.BuglyLog;

public class BluetoothLeScanner {
	private final String TAG = "BluetoothLeScanner";

	private final Handler mHandler;
	private final BluetoothAdapter.LeScanCallback mLeScanCallback;
	private final BluetoothUtils mBluetoothUtils;
	private boolean mScanning;

	public BluetoothLeScanner(final BluetoothAdapter.LeScanCallback leScanCallback, final BluetoothUtils
			bluetoothUtils) {
		mHandler = new Handler();
		mLeScanCallback = leScanCallback;
		mBluetoothUtils = bluetoothUtils;
	}

	public boolean isScanning() {
		return mScanning;
	}

	public void scanLeDevice(final int duration, final boolean enable) {
		if (enable) {
			if (mScanning) {
				return;
			}
			BuglyLog.d(TAG, "~ Starting Scan");
			if (duration > 0) {
				mHandler.postDelayed(new Runnable() {
					@Override
					public void run() {
						BuglyLog.d(TAG, "~ Stopping Scan (timeout)");
						mScanning = false;
						mBluetoothUtils.getBluetoothAdapter().stopLeScan(mLeScanCallback);
					}
				}, duration);
			}
			mScanning = true;
			mBluetoothUtils.getBluetoothAdapter().startLeScan(mLeScanCallback);
		} else {
			BuglyLog.d(TAG, "~ Stopping Scan");
			mScanning = false;
			mBluetoothUtils.getBluetoothAdapter().stopLeScan(mLeScanCallback);
		}
	}
}
```

2.在Activity中实例化并进行扫描

```java
// 蓝牙信息相关
private BluetoothUtils mBluetoothUtils;
private BluetoothLeScanner mScanner;

mBluetoothUtils = new BluetoothUtils(this);
mScanner = new BluetoothLeScanner(mLeScanCallback, mBluetoothUtils);
startScan();

private void startScan() {
	final boolean mIsBluetoothOn = mBluetoothUtils.isBluetoothOn();
	final boolean mIsBluetoothLePresent = mBluetoothUtils.isBluetoothLeSupported();

	mBluetoothUtils.askUserToEnableBluetoothIfNeeded();
	if (mIsBluetoothOn && mIsBluetoothLePresent) {
		mScanner.scanLeDevice(-1, true);
	}
}
```
**以上代码没有注释应该没问题，这其中还有判断手机是否打开蓝牙的代码行，需注意。*

3.解析扫描得到的结果，并根据实际需要在页面内展示
上面用到的`mLeScanCallback`如下：

```java
private final BluetoothAdapter.LeScanCallback mLeScanCallback = new BluetoothAdapter.LeScanCallback() {
	@Override
	public void onLeScan(final BluetoothDevice device, final int rssi, final byte[] scanRecord) {
		runOnUiThread(new Runnable() {
			@Override
			public void run() {
				BuglyLog.i("--------->", "name:"+device.getName());
				// 这里删减了业务逻辑，只做部分知识介绍
				// 对于扫描到的设备，进行额外信息的获取，大多是为了只在扫描配对页显示自家产品，剔除一般设备
				List<AdRecord> adRecord = AdRecordUtils.parseScanRecordAsList(scanRecord);
				for (int i = 0; i < adRecord.size(); i++) {

					AdRecord record = adRecord.get(i);
					if (record.getType() == 0xFF) {
						String mac = ByteUtils.byteArrayToHexString(record.getData());
						// 直接获取出来的字符串形如：[AA,BB,CC...]处理成AA:BB:CC...的样子
						mac = mac.replace("[", "").replace("]", "").replace(", ", ":");
						BuglyLog.e("****", mac);

						// 我们的设备额外信息就是MAC
						if (TextUtils.equals(mac, device.getAddress())) {
							// 添加到UI页面，等着点击配对
						}
					}
				}
			}
		});
	}
};
```

## 4.相关工具类
1.`ByteUtils.java`字节处理，在后面的手机与BLE设备通信处经常需要用到

```java
import java.nio.ByteBuffer;

public class ByteUtils {

	private static final String HEXES = "0123456789ABCDEF";

	private ByteUtils() {
	}

	/**
	 * 字节数组转换成16进制的字符串表示: [01, 30, FF, AA]
	 */
	public static String byteArrayToHexString(final byte[] array) {
		final StringBuilder sb = new StringBuilder();
		boolean firstEntry = true;
		sb.append('[');

		for (final byte b : array) {
			if (!firstEntry) {
				sb.append(", ");
			}
			sb.append(HEXES.charAt((b & 0xF0) >> 4));
			sb.append(HEXES.charAt((b & 0x0F)));
			firstEntry = false;
		}

		sb.append(']');
		return sb.toString();
	}

	/**
	 * 检查一个字节数组是否以另一个字节数组为开始
	 *
	 * @param array  the array
	 * @param prefix the prefix
	 * @return boolean
	 */
	public static boolean doesArrayBeginWith(final byte[] array, final byte[] prefix) {
		if (array.length < prefix.length) {
			return false;
		}

		for (int i = 0; i < prefix.length; i++) {
			if (array[i] != prefix[i]) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 将一个长度为2的字节数组转为int
	 */
	public static int getIntFrom2ByteArray(final byte[] input) {
		final byte[] result = new byte[4];

		result[0] = 0;
		result[1] = 0;
		result[2] = input[0];
		result[3] = input[1];

		return ByteUtils.getIntFromByteArray(result);
	}

	/**
	 * Converts a byte to an int, preserving the sign.
	 * <p/>
	 * For example, FF will be converted to 255 and not -1.
	 *
	 * @param bite the byte
	 * @return the int from byte
	 */
	public static int getIntFromByte(final byte bite) {
		return bite & 0xFF;
	}

	/**
	 * Converts a byte array to an int.
	 *
	 * @param bytes the bytes
	 * @return the int from byte array
	 */
	public static int getIntFromByteArray(final byte[] bytes) {
		return ByteBuffer.wrap(bytes).getInt();
	}

	/**
	 * Converts a byte array to a long.
	 *
	 * @param bytes the bytes
	 * @return the long from byte array
	 */
	public static long getLongFromByteArray(final byte[] bytes) {
		return ByteBuffer.wrap(bytes).getLong();
	}

	/**
	 * Inverts an byte array in place.
	 *
	 * @param array the array
	 */
	public static void invertArray(final byte[] array) {
		final int size = array.length;
		byte temp;

		for (int i = 0; i < size / 2; i++) {
			temp = array[i];
			array[i] = array[size - 1 - i];
			array[size - 1 - i] = temp;
		}
	}
}
```
2.`AdRecordUtils.java`从扫描到的设备中解析各自的额外信息

```java
package com.powerstick.beaglepro.util;

import android.annotation.SuppressLint;
import android.util.SparseArray;

import com.afap.utils.ByteUtils;
import com.powerstick.beaglepro.model.AdRecord;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class AdRecordUtils {

	private AdRecordUtils(){
		// TO AVOID INSTANTIATION
	}

	public static String getRecordDataAsString(final AdRecord nameRecord) {
		if (nameRecord == null) {
			return "";
		}
		return new String(nameRecord.getData());
	}

	public static byte[] getServiceData(final AdRecord serviceData) {
		if (serviceData == null) {
			return null;
		}
		if (serviceData.getType() != AdRecord.TYPE_SERVICE_DATA) return null;

		final byte[] raw = serviceData.getData();
		//Chop out the uuid
		return Arrays.copyOfRange(raw, 2, raw.length);
	}

	public static int getServiceDataUuid(final AdRecord serviceData) {
		if (serviceData == null) {
			return -1;
		}
		if (serviceData.getType() != AdRecord.TYPE_SERVICE_DATA) return -1;

		final byte[] raw = serviceData.getData();
		//Find UUID data in byte array
		int uuid = (raw[1] & 0xFF) << 8;
		uuid += (raw[0] & 0xFF);

		return uuid;
	}

	/*
	 * Read out all the AD structures from the raw scan record
	 */
	public static List<AdRecord> parseScanRecordAsList(final byte[] scanRecord) {
		final List<AdRecord> records = new ArrayList<>();

		int index = 0;
		while (index < scanRecord.length) {
			final int length = scanRecord[index++];
			//Done once we run out of records
			if (length == 0) break;

			final int type = ByteUtils.getIntFromByte(scanRecord[index]);

			//Done if our record isn't a valid type
			if (type == 0) break;

			final byte[] data = Arrays.copyOfRange(scanRecord, index + 1, index + length);

			records.add(new AdRecord(length, type, data));

			//Advance
			index += length;
		}

		return Collections.unmodifiableList(records);
	}

	@SuppressLint("UseSparseArrays")
	public static Map<Integer, AdRecord> parseScanRecordAsMap(final byte[] scanRecord) {
		final Map<Integer, AdRecord> records = new HashMap<>();

		int index = 0;
		while (index < scanRecord.length) {
			final int length = scanRecord[index++];
			//Done once we run out of records
			if (length == 0) break;

			final int type = ByteUtils.getIntFromByte(scanRecord[index]);

			//Done if our record isn't a valid type
			if (type == 0) break;

			final byte[] data = Arrays.copyOfRange(scanRecord, index + 1, index + length);

			records.put(type, new AdRecord(length, type, data));

			//Advance
			index += length;
		}

		return Collections.unmodifiableMap(records);
	}

	public static SparseArray<AdRecord> parseScanRecordAsSparseArray(final byte[] scanRecord) {
		final SparseArray<AdRecord> records = new SparseArray<>();

		int index = 0;
		while (index < scanRecord.length) {
			final int length = scanRecord[index++];
			//Done once we run out of records
			if (length == 0) break;

			final int type = ByteUtils.getIntFromByte(scanRecord[index]);

			//Done if our record isn't a valid type
			if (type == 0) break;

			final byte[] data = Arrays.copyOfRange(scanRecord, index + 1, index + length);

			records.put(type, new AdRecord(length, type, data));

			//Advance
			index += length;
		}

		return records;
	}
}
```

以上，基本涵盖了蓝牙设备扫描与筛选，页面如何显示要根据实际需要了。