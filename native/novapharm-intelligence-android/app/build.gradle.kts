plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.novapharm.intelligence.research"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.novapharm.intelligence.research"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-research"
        testInstrumentationRunner = "android.test.InstrumentationTestRunner"
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
kotlin {
    jvmToolchain(17)
}
dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
