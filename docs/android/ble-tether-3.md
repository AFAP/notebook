# 【Android BLE】蓝牙「防丢器」的相关知识点（三）：手机与设备之间指令传输

* [蓝牙「防丢器」的相关知识点（一）：扫描并识别设备](./ble-tether-1)
* [蓝牙「防丢器」的相关知识点（二）：连接设备并检测连接状态](./ble-tether-2)
* [蓝牙「防丢器」的相关知识点（三）：手机与设备之间指令传输](./ble-tether-3)

## 1.手机发送指令到BLE设备
手机向蓝牙设备发送指令，调用的是BluetoothGatt.writeCharacteristic(BluetoothGattCharacteristic characteristic)方法，本项目中由于涉及多设备管理，故由一个统一的工具类来发送指令。


在Activity中发送指令：


```java
public static final UUID UUID_S_EXTRA = UUID.fromString("0000ff00-0000-1000-8000-00805f9b34fb");//扩展服务
public static final UUID UUID_S_EXTRA_C = UUID.fromString("0000fff0-0000-1000-8000-00805f9b34fb");//设备设置
public static final byte[] VALUE_FIND_LIGHT_ON = {(byte) 0x03, (byte) 0x01, (byte) 0x30}; // 指示灯打开
public static final byte[] VALUE_FIND_LIGHT_OFF = {(byte) 0x03, (byte) 0x00, (byte) 0x30}; // 指示灯关闭

byte[] value = BluetoothUtils.VALUE_FIND_LIGHT_ON;
buttonView.setChecked(!isChecked);
BluetoothUtils.sendValueToBle(mMac, BluetoothUtils.UUID_S_EXTRA, BluetoothUtils.UUID_S_EXTRA_C, value);
```
\*发送指令时，首先根据mac找出该设备对应的BluetoothGatt，然后发送对应的参数。

## 2.判断指令发送是否成功
　　对于手机已经发送出去的指令，如何判断设备是否接收到并生效比较关键，这与很多业务相关联。这一点，在上篇文章中也提到，我们使用BluetoothGattCallback onCharacteristicWrite来解决，设备收到指令后，会进入该回调参数，我们可以获取被写入指令设备的MAC，写入的值，写入的状态，写入的通道等信息，据此来判断是否成功。

## 3.手机获取BLE设备的指令
　　手机与设备建立连接后，可订阅设备相应的通道（如电量、按键指令等），订阅后，方可接收到设备发送的指令信息，该信息从BluetoothGattCallback onCharacteristicRead获取，获取数据后的处理，可参与上篇文章。

## 4附录：指令发送相关的工具类`BluetoothUtils.java`

```java
package com.powerstick.beaglepro.util;

import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;

import com.afap.utils.ByteUtils;
import com.powerstick.beaglepro.MyApplication;
import com.powerstick.beaglepro.services.BluetoothLeService;
import com.tencent.bugly.crashreport.BuglyLog;

import java.util.UUID;

public final class BluetoothUtils {
	public static final UUID UUID_S_IMMEDIATE = UUID.fromString("00001802-0000-1000-8000-00805f9b34fb");//立即报警
	public static final UUID UUID_S_IMMEDIATE_C_ALERT = UUID.fromString("00002a06-0000-1000-8000-00805f9b34fb");//报警级别
	public static final UUID UUID_S_BATTERY = UUID.fromString("0000180f-0000-1000-8000-00805f9b34fb");//电池
	public static final UUID UUID_S_BATTERY_C_LEVEL = UUID.fromString("00002a19-0000-1000-8000-00805f9b34fb");//电池level

	public static final UUID UUID_S_DEVICEINFO = UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb");//设备信息
	public static final UUID UUID_S_DEVICEINFO_C_FIRMWARE = UUID.fromString("00002a28-0000-1000-8000-00805f9b34fb");//固件
	
	public static final UUID UUID_S_KEY = UUID.fromString("0000ffe0-0000-1000-8000-00805f9b34fb");//按键信息
	public static final UUID UUID_S_KEY_C_PRESS = UUID.fromString("0000ffe1-0000-1000-8000-00805f9b34fb");//按键
	
	public static final UUID UUID_S_EXTRA = UUID.fromString("0000ff00-0000-1000-8000-00805f9b34fb");//扩展服务
	public static final UUID UUID_S_EXTRA_C = UUID.fromString("0000fff0-0000-1000-8000-00805f9b34fb");//设备设置
	public static final UUID UUID_S_EXTRA_C_LOGIN = UUID.fromString("0000ffc0-0000-1000-8000-00805f9b34fb");//认证
	public static final UUID UUID_S_EXTRA_C_UNBIND = UUID.fromString("0000ffc1-0000-1000-8000-00805f9b34fb");//解绑
	public static final UUID UUID_S_EXTRA_C_RENAME = UUID.fromString("0000fff3-0000-1000-8000-00805f9b34fb");//重命名
	
	public static final byte[] VALUE_MODE_THETHER = {(byte) 0x01, (byte) 0x00, (byte) 0x10};
	public static final byte[] VALUE_MODE_FIND = {(byte) 0x01, (byte) 0x01, (byte) 0x10};
	
	public static final byte[] VALUE_IMMEDIATE_ON = {(byte) 2}; // 立即报警
	public static final byte[] VALUE_IMMEDIATE_OFF = {(byte) 0}; // 取消立即报警
	
	public static final byte[] VALUE_TETHER_BEEP_ON = {(byte) 0x02, (byte) 0x01, (byte) 0x20}; //警报打开
	public static final byte[] VALUE_TETHER_BEEP_OFF = {(byte) 0x02, (byte) 0x00, (byte) 0x20}; //警报关闭
	
	public static final byte[] VALUE_FIND_LIGHT_ON = {(byte) 0x03, (byte) 0x01, (byte) 0x30}; //指示灯打开
	public static final byte[] VALUE_FIND_LIGHT_OFF = {(byte) 0x03, (byte) 0x00, (byte) 0x30}; //指示灯关闭
	
	public static final byte[] VALUE_UNBIND = {(byte) 0x09, (byte) 0x01, (byte) 0x90};// 解绑指令
	
	public final static int REQUEST_ENABLE_BT = 2001;
	private final Context mActivity;
	private final BluetoothAdapter mBluetoothAdapter;
	
	public BluetoothUtils(final Context activity) {
		mActivity = activity;
		final BluetoothManager btManager = (BluetoothManager) mActivity.getSystemService(Context.BLUETOOTH_SERVICE);
		mBluetoothAdapter = btManager.getAdapter();
	}
	
	public void askUserToEnableBluetoothIfNeeded() {
		if (isBluetoothLeSupported() && (mBluetoothAdapter == null || !mBluetoothAdapter.isEnabled())) {
			final Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
			((Activity) mActivity).startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
		}
	}
	
	public BluetoothAdapter getBluetoothAdapter() {
		return mBluetoothAdapter;
	}
	
	public boolean isBluetoothLeSupported() {
		return mActivity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE);
	}
	
	public boolean isBluetoothOn() {
		if (mBluetoothAdapter == null) {
			return false;
		} else {
			return mBluetoothAdapter.isEnabled();
		}
	}
	
	public static BluetoothLeService getBleService() {
		return MyApplication.getInstance().mBluetoothLeService;
	}
	
	public static boolean sendValueToBle(String mac, UUID serviceId, UUID characteristicId, byte[] value) {
		if (getBleService() == null) {
			BuglyLog.e("BluetoothUtils", "蓝牙服务为null");
			return false;
		}
		boolean result = false;
		BluetoothGattService mService = getBleService().getService(mac, serviceId);
		if (mService != null) {
			BluetoothGattCharacteristic mCharacteristic = mService.getCharacteristic(characteristicId);
			if (mCharacteristic != null) {
				mCharacteristic.setValue(value);
				BuglyLog.w("BluetoothUtils", ByteUtils.byteArrayToHexString(value));
				result = getBleService().writeCharacteristic(mac, mCharacteristic);
			} else {
				BuglyLog.w("BluetoothUtils", "目标通道为NULL");
			}
		}
		return result;
	}



	public static void readCharacteristic(String mac, UUID serviceId, UUID characteristicId) {
		if (getBleService() == null) {
			return;
		}
		BluetoothGattService mService = getBleService().getService(mac, serviceId);
		if (mService != null) {
			BluetoothGattCharacteristic mCharacteristic = mService.getCharacteristic(characteristicId);
			if (mCharacteristic != null) {
				BuglyLog.w("BluetoothUtils", "读取：" + characteristicId.toString());
				getBleService().readCharacteristic(mac, mCharacteristic);
			} else {
				BuglyLog.w("BluetoothUtils", "目标通道为NULL");
			}
		}
	}

	public static void readRemoteRssi(String mac) {
		if (getBleService() == null) {
			return;
		}
		BluetoothGatt gatt = getBleService().getGatt(mac);
		if (gatt != null) {
			gatt.readRemoteRssi();
		}
	}

}
```