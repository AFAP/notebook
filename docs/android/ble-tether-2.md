# 【Android BLE】蓝牙「防丢器」的相关知识点（二）：连接设备并检测连接状态

* [蓝牙「防丢器」的相关知识点（一）：扫描并识别设备](./ble-tether-1)
* [蓝牙「防丢器」的相关知识点（二）：连接设备并检测连接状态](./ble-tether-2)
* [蓝牙「防丢器」的相关知识点（三）：手机与设备之间指令传输](./ble-tether-3)

## 1.初始化蓝牙连接服务类
　　在扫描并识别到自家设备后，接下来就是连接设备，并绑定该设备到手机了。在连接设备之前，我们需要初始化蓝牙连接服务，这个初始化放在应用的Application中进行，整个应用与该服务密切相关。

```java
public BluetoothLeService mBluetoothLeService; // 蓝牙连接服务
public ServiceConnection mServiceConnection; // 蓝牙连接服务

/**
 * 初始化BLE相关
 */
private void initBle() {
	// 初始化并绑定服务
	mServiceConnection = new ServiceConnection() {
		@Override
		public void onServiceConnected(final ComponentName componentName, final IBinder service) {
			BuglyLog.d(TAG, "--onServiceConnected--");
			mBluetoothLeService = ((BluetoothLeService.LocalBinder) service).getService();
			if (!mBluetoothLeService.initialize()) {
				BuglyLog.e(TAG, "Unable to initialize Bluetooth");
			}
		}

		@Override
		public void onServiceDisconnected(final ComponentName componentName) {
			mBluetoothLeService = null;
		}
	};

	Intent gattServiceIntent = new Intent(this, BluetoothLeService.class);
	bindService(gattServiceIntent, mServiceConnection, BIND_AUTO_CREATE);
}
```
初始化过程：

```java
private BluetoothManager mBluetoothManager;
private BluetoothAdapter mBluetoothAdapter;

public boolean initialize() {
	// For API level 18 and above, get a reference to BluetoothAdapter through
	// BluetoothManager.
	if (mBluetoothManager == null) {
		mBluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
		if (mBluetoothManager == null) {
			BuglyLog.e(TAG, "Unable to initialize BluetoothManager.");
			return false;
		}
	}

	mBluetoothAdapter = mBluetoothManager.getAdapter();
	if (mBluetoothAdapter == null) {
		BuglyLog.e(TAG, "Unable to obtain a BluetoothAdapter.");
		return false;
	}

	return true;
}
```


**以上过程在Application的onCreate中进行，以下我再写点与业务逻辑相关的，可不看！该逻辑主要是用来定时检测已经绑定过的设备是否都已经连接，实际场景就是：用户可能在钱包、背包、遥控器上等放置了防丢器，如果超距后会断开连接，但是重新回到连接范围后，手机要发起重连请求，这依赖于此定时检测服务。*

```java
// 以下与应用业务逻辑高度关联，可不看
TimerTask task = new TimerTask() {
	@Override
	public void run() {
		BluetoothManager btManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
		BluetoothAdapter mBluetoothAdapter = btManager.getAdapter();

		if (!mBluetoothAdapter.isEnabled()) {
			BuglyLog.i(TAG, "^^^蓝牙没打开^^^");
			if (mBluetoothLeService != null) {
				// 如果之前有连接信息，需要清除(不清除的后果就是蓝牙重新打开，会检测到之前连接过，但是其实此时并未重新连接)
				mBluetoothLeService.clear();
			}
			return;
		}

		if (mBluetoothLeService != null) {
			List<Beagle> mBeagles = getDaoSession().getBeagleDao().loadAll();
			List<BluetoothDevice> connectDevices = mBluetoothLeService.getConnectedDevices();

			for (Beagle beagle : mBeagles) {
				BuglyLog.d(TAG, "检查：" + beagle.getMac());
				boolean isConnected = false;
				for (BluetoothDevice bd : connectDevices) {
					if (TextUtils.equals(bd.getAddress(), beagle.getMac())) {
						BuglyLog.d(TAG, "定时检测，设备已经处于连接状态：" + beagle.getMac());
						isConnected = true;
						break;
					}
				}

				// 未连接时，自动重连
				if (!isConnected) {
					boolean flag = mBluetoothLeService.connect(beagle.getMac());
					if (flag) {
						BuglyLog.d(TAG, "连接成功：" + beagle.getMac());
					} else {
						BuglyLog.d(TAG, "连接失败：" + beagle.getMac());
					}
				}
			}
		}
	}
};

mTimer = new Timer();
mTimer.schedule(task, 2000, 10000);
```

## 2.连接BLE设备
其实连接设备的步骤非常简单，代码如下：

```java
getApp().mDeviceAddress = mAdapterList.get(position).getAddress();
getApp().mBluetoothLeService.connect(getApp().mDeviceAddress);
```
对应的`BluetoothLeService`中方法如下：

```java
/**
 * 连接蓝牙设备
 *
 * @param mac mac
 */
public boolean connect(String mac) {
	if (mBluetoothAdapter == null || mac == null) {
		BuglyLog.w(TAG, "BluetoothAdapter not initialized or unspecified address.");
		return false;
	}

	List<BluetoothDevice> connectDevices = getConnectedDevices();

	for (BluetoothDevice bd : connectDevices) {
		if (TextUtils.equals(bd.getAddress(), mac)) {
			BuglyLog.d(TAG, "该设备已经连接啦：" + mac);
			return true;
		}
	}

	// 使用之前连接过的
	if (mBluetoothGatts.get(mac) != null) {
		if (mBluetoothGatts.get(mac).connect()) {
			BuglyLog.d(TAG, "使用之前连接过的：" + mac);
			return true;
		} else {
			return false;
		}
	}

	final BluetoothDevice device = mBluetoothAdapter.getRemoteDevice(mac);
	if (device == null) {
		BuglyLog.w(TAG, "Device not found.  Unable to connect.");
		return false;
	}
	device.connectGatt(this, false, mGattCallback);
	BuglyLog.d(TAG, "创建一个新连接，MAC=" + mac);
	return true;
}
```


**这里的getApp()就是获取应用的静态Application，BluetoothLeService类内容较多，最后附上，下面拆分简单说下。*

## 3.处理连接后的回调事件
在上面的连接设备方法中，有一个很关键的参数`mGattCallback`，这个是用来接收蓝牙连接的各类回调事件的，我们主要的业务逻辑都会在此处理：连接成功后的服务通道获取、认证、断开连接处理、指令发送与接收回调、信号强度变化等等。
其对应的代码如下，其实根据BluetoothGattCallback需要重写的方法名称，也能大概知道其作用：

```java
private final BluetoothGattCallback mGattCallback = new BluetoothGattCallback() {

	@Override
	public void onCharacteristicChanged(final BluetoothGatt gatt, final BluetoothGattCharacteristic
			characteristic) {
		dealWithData(gatt, characteristic);
	}

	@Override
	public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
		if (status == BluetoothGatt.GATT_SUCCESS) {
			dealWithData(gatt, characteristic);
		} else {
			BuglyLog.e(TAG, "读取通道信息失败：" + characteristic.getUuid());
		}
	}

	@Override
	public void onConnectionStateChange(final BluetoothGatt gatt, final int status, final int newState) {
		if (newState == BluetoothProfile.STATE_CONNECTED) {
			BuglyLog.i(TAG, "BluetoothGatt连接上,MAC:" + gatt.getDevice().getAddress());

			gatt.discoverServices();
			mBluetoothGatts.put(gatt.getDevice().getAddress(), gatt);

		} else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
			dealDeviceDisconnected(gatt);
			BuglyLog.w(TAG, "BluetoothGatt断开,MAC:" + gatt.getDevice().getAddress());
		}
	}

	@Override
	public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
		super.onCharacteristicWrite(gatt, characteristic, status);

		String uuidStr = characteristic.getUuid().toString();

		BuglyLog.e(TAG, "onCharacteristicWrite-->\nmac:" + gatt.getDevice().getAddress() + "\nuuid:" + uuidStr +
				"\n发送的值:" + ByteUtils.byteArrayToHexString(characteristic.getValue()) + "\nstatus:" + status);

		if (TextUtils.equals(uuidStr, BluetoothUtils.UUID_S_EXTRA_C.toString())) { // 设备信息设置

			StatusEvent e = new StatusEvent();
			String action = "";

			if (characteristic.getValue() == BluetoothUtils.VALUE_MODE_THETHER) {
				action = StatusEvent.ACTION_MODE_THETHER;
			} else if (characteristic.getValue() == BluetoothUtils.VALUE_MODE_FIND) {
				action = StatusEvent.ACTION_MODE_FIND;
			} else if (characteristic.getValue() == BluetoothUtils.VALUE_FIND_LIGHT_ON) {
				action = StatusEvent.ACTION_FIND_LIGHT_ON;
			} else if (characteristic.getValue() == BluetoothUtils.VALUE_FIND_LIGHT_OFF) {
				action = StatusEvent.ACTION_FIND_LIGHT_OFF;
			} else if (characteristic.getValue() == BluetoothUtils.VALUE_TETHER_BEEP_ON) {
				action = StatusEvent.ACTION_TETHER_BEEP_ON;
			} else if (characteristic.getValue() == BluetoothUtils.VALUE_TETHER_BEEP_OFF) {
				action = StatusEvent.ACTION_TETHER_BEEP_OFF;
			}

			e.setAction(action);
			e.setMac(gatt.getDevice().getAddress());
			EventBus.getDefault().post(e);
		} else if (TextUtils.equals(uuidStr, BluetoothUtils.UUID_S_IMMEDIATE_C_ALERT.toString())) { // 立即警报设置

			StatusEvent e = new StatusEvent();
			e.setAction(StatusEvent.ACTION_IMMEDIATE);
			e.setMac(gatt.getDevice().getAddress());
			EventBus.getDefault().post(e);

		} else if (TextUtils.equals(uuidStr, BluetoothUtils.UUID_S_EXTRA_C_LOGIN.toString())) {

			// 通知绑定页面
			BindEvent e = new BindEvent();
			e.setAction(BindEvent.ACTION_BIND_SUCCESS);
			e.setMac(gatt.getDevice().getAddress());
			EventBus.getDefault().post(e);

		} else if (TextUtils.equals(uuidStr, BluetoothUtils.UUID_S_EXTRA_C_UNBIND.toString())) { // 解绑命令
			QueryBuilder qb = MyApplication.getInstance().getDaoSession().getBeagleDao().queryBuilder();
			qb.where(BeagleDao.Properties.Mac.eq(gatt.getDevice().getAddress()));
			List<Beagle> mBeagles = qb.list();

			Beagle beagle;
			if (mBeagles.size() > 0) {
				beagle = mBeagles.get(0);
			} else {
				return;
			}

			if (beagle.getUpdateStatus() == Beagle.UPDATE_PROCESSING) {
				BuglyLog.d(TAG, "解绑--升级…………");
				mBluetoothGatts.remove(gatt.getDevice().getAddress());
			} else {
				BuglyLog.d(TAG, "解绑！！！");
				MyApplication.getInstance().getDaoSession().getBeagleDao().deleteByKey(beagle.getMac());
				StatusEvent e = new StatusEvent();
				e.setAction(StatusEvent.ACTION_UNBIND);
				e.setMac(gatt.getDevice().getAddress());
				EventBus.getDefault().post(e);
			}
		}
	}

	@Override
	public void onServicesDiscovered(final BluetoothGatt gatt, final int status) {
		BuglyLog.w(TAG, "onServicesDiscovered received: " + status);
		if (status == BluetoothGatt.GATT_SUCCESS) {
			dealServicesDiscoverd(gatt);
		} else {
			BuglyLog.w(TAG, "onServicesDiscovered received: " + status);
		}
	}

	@Override
	public void onReadRemoteRssi(BluetoothGatt gatt, int rssi, int status) {
		if (status == BluetoothGatt.GATT_SUCCESS) {

			StatusEvent e = new StatusEvent();
			e.setAction(StatusEvent.ACTION_RSSI);
			e.setMac(gatt.getDevice().getAddress());
			e.setRssi(rssi);
			EventBus.getDefault().post(e);

		} else {
			BuglyLog.w(TAG, "onReadRemoteRssi received: " + status);
		}
	}
};
```

通常在建立连接后，会进入onServicesDiscovered方法，这个时候可已根据需要去发起一些通道的订阅（可遍历所有通道信息，根据通道的可读、通知属性来订阅）。我这里，手机需要向设备发起认证信息（这个需要固件配合，认证后，其他手机就扫描不到该设备了），认证的指令自定义约定，此处略。从最后附录的全部代码可以看到认证指令发送失败是立即通知程序页面认证失败的，但是成功发送认证指令，并没有立即通知，这里要注意，真正的指令是否成功写入设备，是要通过onCharacteristicWrite来判断的：
* onCharacteristicChanged：接收到通道指令（前提是已经订阅），如设备的点击、双击、长按事件；
* onCharacteristicRead：手机主动发起的read后，设备回传过来的数据，如读取设备电量、固件版本等；
* onConnectionStateChange：设备与手机的连接状态变化：连接成功、断开连接；
* onCharacteristicWrite：手机向设备写入指令的结果，该方法中可获取被写入通道的ID，内容，状态；
* onServicesDiscovered：刚建立连接时，设备拥有的服务被发现； 
* onReadRemoteRssi：设备信号强度变化。

要处理手机与设备之间的业务，BluetoothGattCallback是重点，再各个回调方法中，结合自己的业务逻辑，基本可完成应用的基础功能：绑定（成功后是要写入手机本地数据库的，与蓝牙无关就不贴了）、断开报警、信号弱时提醒距离远、接收设备指令来完成对应动作……

## 4. 附录：
上面的代码中有一些方法代码缺失，下面是`BluetoothLeService.java`完整代码：


```java
package com.powerstick.beaglepro.services;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Binder;
import android.os.IBinder;
import android.support.v7.app.NotificationCompat;
import android.telephony.TelephonyManager;
import android.text.TextUtils;

import com.afap.utils.ByteUtils;
import com.powerstick.beaglepro.MyApplication;
import com.powerstick.beaglepro.R;
import com.powerstick.beaglepro.event.BatteryEvent;
import com.powerstick.beaglepro.event.BindEvent;
import com.powerstick.beaglepro.event.FirmwareEvent;
import com.powerstick.beaglepro.event.StatusEvent;
import com.powerstick.beaglepro.greendao.Beagle;
import com.powerstick.beaglepro.greendao.BeagleDao;
import com.powerstick.beaglepro.receiver.GattUpdateReceiver;
import com.powerstick.beaglepro.util.BluetoothUtils;
import com.powerstick.beaglepro.util.Utils;
import com.tencent.bugly.crashreport.BuglyLog;

import org.greenrobot.eventbus.EventBus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import de.greenrobot.dao.query.QueryBuilder;

public class BluetoothLeService extends Service {
	private final static String TAG = "BluetoothLeService";
	private final IBinder mBinder = new LocalBinder();
	private BluetoothManager mBluetoothManager;
	private BluetoothAdapter mBluetoothAdapter;
	// 记录MAC对应的BluetoothGatt，可通过MAC来获取各个设备的BluetoothGatt
	private Map<String, BluetoothGatt> mBluetoothGatts = new HashMap<>();

	private final BluetoothGattCallback mGattCallback = new BluetoothGattCallback() {

		@Override
		public void onCharacteristicChanged(final BluetoothGatt gatt, final BluetoothGattCharacteristic
				characteristic) {
			dealWithData(gatt, characteristic);
		}

		@Override
		public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
			if (status == BluetoothGatt.GATT_SUCCESS) {
				dealWithData(gatt, characteristic);
			} else {
				BuglyLog.e(TAG, "读取通道信息失败：" + characteristic.getUuid());
			}
		}

		@Override
		public void onConnectionStateChange(final BluetoothGatt gatt, final int status, final int newState) {
			if (newState == BluetoothProfile.STATE_CONNECTED) {
				BuglyLog.i(TAG, "BluetoothGatt连接上,MAC:" + gatt.getDevice().getAddress());

				gatt.discoverServices();
				mBluetoothGatts.put(gatt.getDevice().getAddress(), gatt);

			} else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
				dealDeviceDisconnected(gatt);
				BuglyLog.w(TAG, "BluetoothGatt断开,MAC:" + gatt.getDevice().getAddress());
			}
		}

		@Override
		public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
			super.onCharacteristicWrite(gatt, characteristic, status);

			String uuidStr = characteristic.getUuid().toString();

			BuglyLog.e(TAG, "onCharacteristicWrite-->\nmac:" + gatt.getDevice().getAddress() + "\nuuid:" + uuidStr +
					"\n发送的值:" + ByteUtils.byteArrayToHexString(characteristic.getValue()) + "\nstatus:" + status);

			if (TextUtils.equals(uuidStr, BluetoothUtils.UUID_S_EXTRA_C.toString())) { // 设备信息设置

				StatusEvent e = new StatusEvent();
				String action = "";

				if (characteristic.getValue() == BluetoothUtils.VALUE_MODE_THETHER) {
					action = StatusEvent.ACTION_MODE_THETHER;
				} else if (characteristic.getValue() == BluetoothUtils.VALUE_MODE_FIND) {
					action = StatusEvent.ACTION_MODE_FIND;
				} else if (characteristic.getValue() == BluetoothUtils.VALUE_FIND_LIGHT_ON) {
					action = StatusEvent.ACTION_FIND_LIGHT_ON;
				} else if (characteristic.getValue() == BluetoothUtils.VALUE_FIND_LIGHT_OFF) {
					action = StatusEvent.ACTION_FIND_LIGHT_OFF;
				} else if (characteristic.getValue() == BluetoothUtils.VALUE_TETHER_BEEP_ON) {
					action = StatusEvent.ACTION_TETHER_BEEP_ON;
				} else if (characteristic.getValue() == BluetoothUtils.VALUE_TETHER_BEEP_OFF) {
					action = StatusEvent.ACTION_TETHER_BEEP_OFF;
				}
				e.setAction(action);
				e.setMac(gatt.getDevice().getAddress());
				EventBus.getDefault().post(e);
			} else if (TextUtils.equals(uuidStr, BluetoothUtils.UUID_S_IMMEDIATE_C_ALERT.toString())) { // 立即警报设置

				StatusEvent e = new StatusEvent();
				e.setAction(StatusEvent.ACTION_IMMEDIATE);
				e.setMac(gatt.getDevice().getAddress());
				EventBus.getDefault().post(e);

			} else if (TextUtils.equals(uuidStr, BluetoothUtils.UUID_S_EXTRA_C_LOGIN.toString())) {

				// 通知绑定页面
				BindEvent e = new BindEvent();
				e.setAction(BindEvent.ACTION_BIND_SUCCESS);
				e.setMac(gatt.getDevice().getAddress());
				EventBus.getDefault().post(e);

			} else if (TextUtils.equals(uuidStr, BluetoothUtils.UUID_S_EXTRA_C_UNBIND.toString())) { // 解绑命令
				QueryBuilder qb = MyApplication.getInstance().getDaoSession().getBeagleDao().queryBuilder();
				qb.where(BeagleDao.Properties.Mac.eq(gatt.getDevice().getAddress()));
				List<Beagle> mBeagles = qb.list();

				Beagle beagle;
				if (mBeagles.size() > 0) {
					beagle = mBeagles.get(0);
				} else {
					return;
				}

				// 升级完毕后的解绑，不做删除
//                if (beagle.getUpdateStatus() == Beagle.UPDATE_COMPLETED) {
//                    BuglyLog.d(TAG, "解绑--升级完毕");
//                    beagle.setUpdateStatus(Beagle.UPDATE_NONE);
//                    MyApplication.getInstance().getDaoSession().getBeagleDao().update(beagle);
//                } else
				if (beagle.getUpdateStatus() == Beagle.UPDATE_PROCESSING) {
					BuglyLog.d(TAG, "解绑--升级…………");
					mBluetoothGatts.remove(gatt.getDevice().getAddress());
				} else {
					BuglyLog.d(TAG, "解绑！！！");
					MyApplication.getInstance().getDaoSession().getBeagleDao().deleteByKey(beagle.getMac());
					StatusEvent e = new StatusEvent();
					e.setAction(StatusEvent.ACTION_UNBIND);
					e.setMac(gatt.getDevice().getAddress());
					EventBus.getDefault().post(e);
				}
			}
		}

		@Override
		public void onServicesDiscovered(final BluetoothGatt gatt, final int status) {
			BuglyLog.w(TAG, "onServicesDiscovered received: " + status);
			if (status == BluetoothGatt.GATT_SUCCESS) {
				dealServicesDiscoverd(gatt);
			} else {
				BuglyLog.w(TAG, "onServicesDiscovered received: " + status);
			}
		}

		@Override
		public void onReadRemoteRssi(BluetoothGatt gatt, int rssi, int status) {
			if (status == BluetoothGatt.GATT_SUCCESS) {

				StatusEvent e = new StatusEvent();
				e.setAction(StatusEvent.ACTION_RSSI);
				e.setMac(gatt.getDevice().getAddress());
				e.setRssi(rssi);
				EventBus.getDefault().post(e);

			} else {
				BuglyLog.w(TAG, "onReadRemoteRssi received: " + status);
			}
		}
	};

	public boolean initialize() {
		// For API level 18 and above, get a reference to BluetoothAdapter through
		// BluetoothManager.
		if (mBluetoothManager == null) {
			mBluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
			if (mBluetoothManager == null) {
				BuglyLog.e(TAG, "Unable to initialize BluetoothManager.");
				return false;
			}
		}

		mBluetoothAdapter = mBluetoothManager.getAdapter();
		if (mBluetoothAdapter == null) {
			BuglyLog.e(TAG, "Unable to obtain a BluetoothAdapter.");
			return false;
		}

		return true;
	}

	public BluetoothGatt getGatt(String mac) {
		return mBluetoothGatts.get(mac);
	}

	public void close() {
		for (BluetoothGatt gatt : mBluetoothGatts.values()) {
			if (gatt != null) {
				gatt.close();
				gatt = null;

			}
		}
	}

	public void clear() {
		if (mBluetoothAdapter == null) {
			BuglyLog.w(TAG, "BluetoothAdapter not initialized or unspecified address.");
			return;
		}
		mBluetoothGatts.clear();
	}

	/**
		* 连接蓝牙设备
		*
		* @param mac mac
		*/
	public boolean connect(String mac) {
		if (mBluetoothAdapter == null || mac == null) {
			BuglyLog.w(TAG, "BluetoothAdapter not initialized or unspecified address.");
			return false;
		}

		List<BluetoothDevice> connectDevices = getConnectedDevices();

		for (BluetoothDevice bd : connectDevices) {
			if (TextUtils.equals(bd.getAddress(), mac)) {
				BuglyLog.d(TAG, "该设备已经连接啦：" + mac);
				return true;
			}
		}

		// 使用之前连接过的
		if (mBluetoothGatts.get(mac) != null) {
			if (mBluetoothGatts.get(mac).connect()) {
				BuglyLog.d(TAG, "使用之前连接过的：" + mac);
				return true;
			} else {
				return false;
			}
		}

		final BluetoothDevice device = mBluetoothAdapter.getRemoteDevice(mac);
		if (device == null) {
			BuglyLog.w(TAG, "Device not found.  Unable to connect.");
			return false;
		}
		device.connectGatt(this, false, mGattCallback);
		BuglyLog.d(TAG, "创建一个新连接，MAC=" + mac);
		return true;
	}

	/**
		* Disconnects an existing connection or cancel a pending connection. The disconnection result
		* is reported asynchronously through the
		* {@code BluetoothGattCallback#onConnectionStateChange(android.bluetooth.BluetoothGatt, int, int)}
		* callback.
		*/
	public void disconnect(String mac) {
		if (mBluetoothAdapter == null || mBluetoothGatts.get(mac) == null) {
			BuglyLog.w(TAG, "BluetoothAdapter not initialized");
			return;
		}
		BluetoothGatt gatt = mBluetoothGatts.get(mac);
		gatt.disconnect();
		gatt.close();
		mBluetoothGatts.remove(mac);
	}

	/**
		* Retrieves a list of supported GATT services on the connected device. This should be
		* invoked only after {@code BluetoothGatt#discoverServices()} completes successfully.
		*
		* @return A {@code List} of supported services.
		*/
	public List<BluetoothGattService> getSupportedGattServices(String mac) {
		if (mBluetoothGatts.get(mac) == null) {
			return null;
		}
		return mBluetoothGatts.get(mac).getServices();
	}

	/**
		* 读取目标通道数据
		*
		* @param mac            目标设备MAC
		* @param characteristic 目标通道
		*/
	public void readCharacteristic(String mac, BluetoothGattCharacteristic characteristic) {
		if (mBluetoothAdapter == null || mBluetoothGatts.get(mac) == null) {
			BuglyLog.w(TAG, "BluetoothAdapter not initialized");
			return;
		}
		mBluetoothGatts.get(mac).readCharacteristic(characteristic);
	}

	/**
		* 向目标通道写入数据
		*
		* @param mac            目标设备MAC
		* @param characteristic 目标通道
		*/
	public boolean writeCharacteristic(String mac, BluetoothGattCharacteristic characteristic) {
		if (mBluetoothAdapter == null || mBluetoothGatts.get(mac) == null) {
			BuglyLog.w(TAG, "BluetoothAdapter not initialized");
			return false;
		}

		return mBluetoothGatts.get(mac).writeCharacteristic(characteristic);
	}

	/**
		* 设置监听通道通知
		*
		* @param mac            目标设备MAC
		* @param characteristic 目标通道
		* @param enabled        是否接收通知
		*/
	public void setCharacteristicNotification(String mac, BluetoothGattCharacteristic characteristic, boolean enabled) {
		if (mBluetoothAdapter == null || mBluetoothGatts.get(mac) == null) {
			BuglyLog.w(TAG, "BluetoothAdapter未初始化");
			return;
		}
		mBluetoothGatts.get(mac).setCharacteristicNotification(characteristic, enabled);
	}

	public List<BluetoothDevice> getConnectedDevices() {
		if (mBluetoothManager == null) {
			return null;
		}

		return mBluetoothManager.getConnectedDevices(BluetoothProfile.GATT_SERVER);
	}

	public BluetoothGattService getService(String mac, UUID uuid) {
		if (mBluetoothGatts.get(mac) == null) {
			BuglyLog.w(TAG, "BluetoothGatt未初始化");
			return null;
		}
		return mBluetoothGatts.get(mac).getService(uuid);
	}

	@Override
	public IBinder onBind(final Intent intent) {
		return mBinder;
	}

	@Override
	public boolean onUnbind(final Intent intent) {
		close();
		return super.onUnbind(intent);
	}

	public class LocalBinder extends Binder {
		public BluetoothLeService getService() {
			return BluetoothLeService.this;
		}
	}

	/**
	 * 处理Service被发现
	 */
	private void dealServicesDiscoverd(BluetoothGatt gatt) {
		String mac = gatt.getDevice().getAddress();
		if (mMediaPlayer != null && mMediaPlayer.isPlaying()) {
			mMediaPlayer.stop();
		}

		displayGattServices(getSupportedGattServices(mac), mac);
	}

	/**
	 * 处理设备断开的情况
	 */
	private void dealDeviceDisconnected(BluetoothGatt gatt) {
		Context context = getApplicationContext();
		String mac = gatt.getDevice().getAddress();

		// TODO
		BuglyLog.i(TAG, "断开连接 响铃:" + mac);
		mBluetoothGatts.get(mac).close();
		mBluetoothGatts.remove(mac);

		QueryBuilder qb = MyApplication.getInstance().getDaoSession().getBeagleDao().queryBuilder();
		qb.where(BeagleDao.Properties.Mac.eq(mac));
		List<Beagle> mBeagles = qb.list();

		Beagle beagle;
		if (mBeagles.size() > 0) {
			beagle = mBeagles.get(0);
		} else {
			return;
		}

		if (beagle.getPhoneAlarm() && Utils.isNeedNotify(context, beagle) && beagle.getMode() == 0) {

			bellToRemind();

			Intent i = new Intent(GattUpdateReceiver.ACTION_CANCEL);
			PendingIntent pIntent = PendingIntent.getBroadcast(context, 0, i, PendingIntent.FLAG_UPDATE_CURRENT);
			Uri ringUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
			Notification notify = new NotificationCompat
					.Builder(context)
					.setTicker(context.getString(R.string.app_name))
					.setContentTitle(context.getString(R.string.app_name))
					.setContentText("Device " + beagle.getAlias() + " Disconnected")
					.setSmallIcon(R.drawable.ic_notification)
					.setAutoCancel(false)
					.setOngoing(true)
					.setContentIntent(pIntent)
					.setSound(ringUri)
					.build();
			MyApplication.getInstance().getmNotificationManager().notify(GattUpdateReceiver.NOTIFY_ID, notify);
		}

		// 通知主界面
		StatusEvent e = new StatusEvent();
		e.setAction(StatusEvent.ACTION_GATT_DISCONNECTED);
		e.setMac(mac);
		EventBus.getDefault().post(e);
	}
	
	private static MediaPlayer mMediaPlayer;
	/**
	 * 处理接收到的数据
	 */
	private void dealWithData(final BluetoothGatt gatt, final BluetoothGattCharacteristic characteristic) {
		BuglyLog.d(TAG, "进入方法:dealWithData()");

		final UUID uuid = characteristic.getUuid();
		final String mac = gatt.getDevice().getAddress();
		final byte[] dataArr = characteristic.getValue();
		String dataString = new String(dataArr);

		BuglyLog.i(TAG, "接收到地址:" + mac);
		BuglyLog.i(TAG, "接收到参数:" + ByteUtils.byteArrayToHexString(dataArr));
		BuglyLog.i(TAG, "接收到参数:" + dataString);

		if (BluetoothUtils.UUID_S_KEY_C_PRESS.equals(uuid)) {
			int v = ByteUtils.getIntFromByte(dataArr[0]);

			if (v == 1) { // 短按
				// 通知主界面
				StatusEvent e = new StatusEvent();
				e.setAction(StatusEvent.ACTION_PRESS_SHORT);
				e.setMac(mac);
				EventBus.getDefault().post(e);

			} else if (v == 2) { // 长按
				if (mMediaPlayer != null && mMediaPlayer.isPlaying()) {
					mMediaPlayer.stop();
				} else {
					bellToRemind();
				}
			}

		} else if (BluetoothUtils.UUID_S_BATTERY_C_LEVEL.equals(uuid)) {

			// 通知设备信息界面
			BatteryEvent e = new BatteryEvent();
			e.setMac(mac);
			e.setLevel(ByteUtils.getIntFromByte(dataArr[0]));
			EventBus.getDefault().post(e);

		} else if (BluetoothUtils.UUID_S_DEVICEINFO_C_FIRMWARE.equals(uuid)) {

			// 通知设备信息界面
			FirmwareEvent e = new FirmwareEvent();
			e.setMac(mac);
			e.setVersion(dataString);
			EventBus.getDefault().post(e);

		}
	}

	void bellToRemind() {
		AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
		int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
		am.setStreamVolume(AudioManager.STREAM_MUSIC, max, AudioManager.FLAG_PLAY_SOUND);

		if (mMediaPlayer != null && mMediaPlayer.isPlaying()) {
			mMediaPlayer.stop();
		}

		mMediaPlayer = MediaPlayer.create(getApplicationContext(), R.raw.helium);
		mMediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
		mMediaPlayer.setLooping(false); //循环播放
		mMediaPlayer.start();
	}

	BluetoothGattCharacteristic mNotifyCharacteristic;

	private void displayGattServices(List<BluetoothGattService> gattServices, String mac) {
		if (gattServices == null) {
			return;
		}

		for (final BluetoothGattService gattService : gattServices) {
			final List<BluetoothGattCharacteristic> gattCharacteristics = gattService.getCharacteristics();

			String uuid0 = gattService.getUuid().toString();

			BuglyLog.i(TAG, "服务uuid0=" + uuid0);
			// Loops through available Characteristics.
			for (final BluetoothGattCharacteristic gattCharacteristic : gattCharacteristics) {
				UUID uuid = gattCharacteristic.getUuid();

				BuglyLog.d(TAG, "服务uuid=" + uuid);
				// 监听按键指令以及认证结果信息
				if (BluetoothUtils.UUID_S_KEY_C_PRESS.equals(uuid) ||
						BluetoothUtils.UUID_S_EXTRA_C_LOGIN.equals(uuid)) {
					BuglyLog.i(TAG, "启动监听通知服务uuid=" + uuid);
					int charaProp = gattCharacteristic.getProperties();
					if ((charaProp | BluetoothGattCharacteristic.PROPERTY_NOTIFY) > 0) {
						mNotifyCharacteristic = gattCharacteristic;
						setCharacteristicNotification(mac, gattCharacteristic, true);
					}
				}
			}
		}

		// 建立连接后，搜寻到设备服务，且该设备并未找到绑定记录，则写入认证信息进行绑定
		String imei = ((TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE)).getDeviceId();
		byte[] loginValue = new byte[20];
		// 认证的具体内容我就不写了，这个是要与设备固件开发约定好的

		boolean loginFlag = BluetoothUtils.sendValueToBle(mac, BluetoothUtils.UUID_S_EXTRA, BluetoothUtils
				.UUID_S_EXTRA_C_LOGIN, loginValue);
		BuglyLog.i(TAG, "写入认证信息=" + loginFlag);
		if (!loginFlag) {
			BindEvent e = new BindEvent();
			e.setAction(BindEvent.ACTION_BIND_FAIL);
			e.setMac(mac);
			EventBus.getDefault().post(e);
		}
	}
}
```

