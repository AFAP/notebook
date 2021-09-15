# OkHttp3.0(结合Retrofit2/Rxjava)利用拦截器实现全局超时自动登录、添加统一参数

应用场景：1.服务端为了统计各个平台、版本的使用情况，有时在接口中要求传递统一的诸如version(客户端版本)、os(客户端平台android/iOS)、userId等参数，这时如果在接口中一一添加就比较繁琐了，考虑做全局处理；另外，一次登录成功后，登录状态都是有时效的，所以在发生登录失效后，需要自动重新刷新登录状态，而且一般情况下，单个请求在发出前是没法判断是否已经登录超时的，所以就需要一个全局的处理方案。

其实这个与Retrofit2/Rxjava貌似没有关系，之所以标题里提到这个，是因为我的项目是结合这俩库用的，我在搜索这类问题的解决方法时就是从Retrofit2/Rxjava的retryWhen方法下手的，后来发现直接在OkHttpClient添加拦截器，即可实现想要的效果，而且是全局性的，这应该是这类问题的最简单解决方式了。

主要代码如下：
`Network.java`
```java
import android.text.TextUtils;
import android.util.Log;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import org.greenrobot.eventbus.EventBus;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;

import okhttp3.Cookie;
import okhttp3.CookieJar;
import okhttp3.FormBody;
import okhttp3.HttpUrl;
import okhttp3.Interceptor;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okhttp3.logging.HttpLoggingInterceptor;
import okio.BufferedSource;
import retrofit2.Call;
import retrofit2.CallAdapter;
import retrofit2.Converter;
import retrofit2.Retrofit;
import retrofit2.adapter.rxjava.RxJavaCallAdapterFactory;
import retrofit2.converter.gson.GsonConverterFactory;

public class Network {
    private static final String TAG = "Network";

    private static APIService apis;
    private static ReLoginService reLoginService;

    private static Converter.Factory mExtraGsonConverterFactory = ExtraGsonConverterFactory.create();
    private static CallAdapter.Factory rxJavaCallAdapterFactory = RxJavaCallAdapterFactory.create();

    public static APIService getAPIService() {
        if (apis == null) {
            // TODO 最后关闭日志
            HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
            loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BODY);

            // OkHttp3.0的使用方式
            OkHttpClient okHttpClient = new OkHttpClient.Builder()
                    .retryOnConnectionFailure(true)
                    .addInterceptor(new Interceptor() {
                        @Override
                        public Response intercept(Chain chain) throws IOException {
                            Request original = chain.request();
                            Request.Builder requestBuilder = original.newBuilder();
                            if (original.body() instanceof FormBody) {
                                FormBody.Builder newFormBody = new FormBody.Builder();
                                FormBody oldFormBody = (FormBody) original.body();
                                for (int i = 0; i < oldFormBody.size(); i++) {
                                    newFormBody.addEncoded(oldFormBody.encodedName(i), oldFormBody.encodedValue(i));
                                }
                                newFormBody.add("os", "android");
                                requestBuilder.method(original.method(), newFormBody.build());
                            } else if (original.body() instanceof MultipartBody) {
                                MultipartBody.Builder newFormBody = new MultipartBody.Builder();
                                // 默认是multipart/mixed，大坑【主要是我们php后台接收时头信息要求严格】
                                newFormBody.setType(MediaType.parse("multipart/form-data"));
                                MultipartBody oldFormBody = (MultipartBody) original.body();
                                for (int i = 0; i < oldFormBody.size(); i++) {
                                    newFormBody.addPart(oldFormBody.part(i));
                                }
                                newFormBody.addFormDataPart("os", "android");
                                requestBuilder.method(original.method(), newFormBody.build());
                            } else if (TextUtils.equals(original.method(), "POST")) {
                                FormBody.Builder newFormBody = new FormBody.Builder();
                                newFormBody.add("os", "android");
                                requestBuilder.method(original.method(), newFormBody.build());
                            }

                            Request request = requestBuilder.build();
                            return chain.proceed(request);
                        }
                    })
                    .addInterceptor(new Interceptor() {
                        @Override
                        public Response intercept(final Chain chain) throws IOException {
                            // 原始请求
                            Request request = chain.request();
                            Response response = chain.proceed(request);
                            ResponseBody responseBody = response.body();
                            BufferedSource source = responseBody.source();
                            source.request(Long.MAX_VALUE);
                            String respString = source.buffer().clone().readString(Charset.defaultCharset());
                            Log.d(TAG, "--->返回报文，respString = " + respString);
                            // TODO 这里判断是否是登录超时的情况
                            JSONObject j = null;
                            try {
                                j = new JSONObject(respString);
                            } catch (JSONException e) {
                                e.printStackTrace();
                            }
                            // 这里与后台约定的状态码700表示登录超时【后台是java，客户端自己维护cookie，没有token机制。但此处如果刷新token，方法也一样】
                            if (j!= null && j.optInt("status") == 700) {
                                Log.d(TAG, "--->登录失效，自动重新登录");
                                // TODO 本地获取到之前的user信息
                                UserInfo  user = SysApplication.getInstance().getDB().getCurrentUser();
                                if (user == null) {
                                    Log.d(TAG, "--->用户为空需要用户主动去登录");
                                    // 扔出需要手动重新登录的异常（BaseSubscriber里处理）
                                    throw new ExtraApiException(700, "请登录");
                                }
                                String phoneNum = user.getPhoneNum();
                                String password = user.getPass();
                                Call<JsonObject> call = getReloginService().reLogin(phoneNum, password);
                                JsonObject json = call.execute().body();
                                // 判断是否登录成功了
                                if (json.get("status").getAsInt() == 200) {
                                    // TODO 登录成功后，根据需要保存用户信息、会话信息等
                                    // 最重要的是将当前请求重新执行一遍!!!
                                    response = chain.proceed(request);
                                    Log.d(TAG, "--->完成二次请求");
                                } else {
                                    Log.d(TAG, "--->自动登录失败");
                                    // TODO 扔出需要手动重新登录的异常（BaseSubscriber里处理，此时已经是自动重新登录也不行，如密码在其他终端修改了之类的）
                                    throw new ExtraApiException(700, "请重新登录");
                                }
                            }
                            return response;
                        }
                    })
                    .cookieJar(new CookieJar() {
                        List<Cookie> cookies;
                        @Override
                        public void saveFromResponse(HttpUrl url, List<Cookie> cookies) {
                                // TODO 根据实际后台返回信息，保存cookies
                        }

                        @Override
                        public List<Cookie> loadForRequest(HttpUrl url) {

                            return cookies;
                        }
                    })
                    .addInterceptor(loggingInterceptor)
                    .build();

            Retrofit retrofit = new Retrofit.Builder()
                    .baseUrl(Constant.HOST_APP)
                    .addConverterFactory(mExtraGsonConverterFactory)
                    .addCallAdapterFactory(rxJavaCallAdapterFactory)
                    .client(okHttpClient)
                    .build();
            apis = retrofit.create(APIService.class);
        }
        return apis;
    }


    // 重新登录之所以单独写在一个interface中，是因为其他所有方法都采用了自定义Gson解析器，在解析器里就处理了最外层的status，只获取有效信息
    // 重新登录时，需要自己重新处理，并保存cookie等信息
    public static ReLoginService getReloginService() {
        if (reLoginService == null) {
            // TODO 最后关闭日志
            HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
            loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BODY);

            // OkHttp3.0的使用方式
            OkHttpClient okHttpClient = new OkHttpClient.Builder()
                    .addInterceptor(loggingInterceptor)
                    .cookieJar(new CookieJar() {
                        @Override
                        public void saveFromResponse(HttpUrl url, List<Cookie> cookies) {
                            // TODO
                        }

                        @Override
                        public List<Cookie> loadForRequest(HttpUrl url) {
                            return new ArrayList<>();
                        }
                    })
                    .build();

            Retrofit retrofit = new Retrofit.Builder()
                    .baseUrl(Constant.HOST_APP)
                    .addConverterFactory(GsonConverterFactory.create())
                    .client(okHttpClient)
                    .build();
            reLoginService = retrofit.create(ReLoginService.class);
        }
        return reLoginService;

    }
}
```

`ExtraGsonResponseBodyConverter.java`这个是自定义解析器，作用是去除服务端返回的最外层信息，只保留内部有效信息体。另外可以统一处理返回的status，抛出自定义异常，然后在全局统一的Subscriber中onError处理。
```java
import android.text.TextUtils;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.Charset;

import okhttp3.MediaType;
import okhttp3.ResponseBody;
import retrofit2.Converter;

import static okhttp3.internal.Util.UTF_8;

final class ExtraGsonResponseBodyConverter<T> implements Converter<ResponseBody, T> {
    private final Gson gson;
    private final TypeAdapter<T> adapter;

    ExtraGsonResponseBodyConverter(Gson gson, TypeAdapter<T> adapter) {
        this.gson = gson;
        this.adapter = adapter;
    }

    @Override
    public T convert(ResponseBody value) throws IOException {
        try {
            JSONObject response = new JSONObject(value.string());


            // 结果状态不对的，统一抛出异常，进入Subscriber的onError回调函数
            if (response.optInt("status") != 200) {
                value.close();
                throw new ExtraApiException(response.optInt("status"), response.optString("message"));
            }

            // 后台返回不统一、不规范，客户端来背锅处理……
            String info = response.optString("json");
            if (TextUtils.isEmpty(info)) {
                info = response.optString("resultList");
            }
            if (TextUtils.isEmpty(info) || TextUtils.equals(info.toLowerCase(), "null")) {
                info = "{}";
            }

            MediaType contentType = value.contentType();
            Charset charset = contentType != null ? contentType.charset(UTF_8) : UTF_8;


            InputStream inputStream = new ByteArrayInputStream(info.getBytes());
            Reader reader = new InputStreamReader(inputStream, charset);
            JsonReader jsonReader = gson.newJsonReader(reader);

            return adapter.read(jsonReader);
        } catch (JSONException e) {
            throw new IOException();
        } finally {
            value.close();
        }
    }
}
```


`ReLoginService.java`用于单独进行重新登录请求，保留了服务端返回的所有信息体。
```java
import com.google.gson.JsonObject;

import retrofit2.Call;
import retrofit2.http.Field;
import retrofit2.http.FormUrlEncoded;
import retrofit2.http.POST;


public interface ReLoginService {

    /**
        * 登录
        *
        * @param name 用户名
        * @param pass ，密码
        */
    @FormUrlEncoded
    @POST("msLogin")
    Call<JsonObject> reLogin(
            @Field("name") String name,
            @Field("pass") String pass
    );
}
```

至此，问题解决，主要思路就是，利用OkHttpClient的OkHttpClient方法：
* 将原有请求重新组装
* 将响应信息预处理，如果对应的是登录失效，则进行重新登录，若登录成功就再次执行原请求；如登录不成功，则提示用户自己去登录

此外，还有几点说明：
* 自定义ConverterFactory有利于将返回信息中的无效信息或过多层级统一处理掉，简化单个请求成功后的处理逻辑
* 自定义Exception有利于在全局统一的Subscriber（结合RxJava）中处理异常
* 用于辅助查看请求信息的HttpLoggingInterceptor，要到最后进行addInterceptor，不然你之前做的处理（cookie、添加的参数）可能看在日志里就看不到了