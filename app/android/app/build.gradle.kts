import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// 릴리스 서명 키 — 저장소 루트의 tools/android_keys/key.properties (git 제외).
// rootProject 는 app/android 이므로 저장소 루트는 두 단계 위입니다.
// 파일이 없으면 디버그 키로 빌드됩니다(개발용). 그 상태로 스토어에 올리면 거부되므로 경고를 남깁니다.
val keystoreProperties = Properties().apply {
    val f = rootProject.file("../../tools/android_keys/key.properties")
    if (f.exists()) {
        f.inputStream().use { load(it) }
    } else {
        logger.warn("⚠️  릴리스 서명 키를 찾지 못했습니다: ${f.absolutePath} — 디버그 키로 서명됩니다(스토어 업로드 불가)")
    }
}

android {
    namespace = "kr.mungcare.mungcare_app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "kr.mungcare.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (keystoreProperties.containsKey("storeFile")) {
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (keystoreProperties.containsKey("storeFile")) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug") // 키가 없는 환경(CI 등)에서도 빌드는 되도록
            }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
