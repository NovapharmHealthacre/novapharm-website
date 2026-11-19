// Independent JVM source-only CLIP test build. Not an Android app or APK.
plugins {
    kotlin("jvm") version "2.2.21"
}

group = "com.novapharm.intelligence"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    // JSON is used only for strict, fail-closed source candidate response parsing.
    implementation("org.json:json:20260814")
    testImplementation(kotlin("test-junit5"))
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:1.12.2")
}

kotlin {
    jvmToolchain(17)
    sourceSets {
        main { kotlin.srcDir("../src/main/kotlin") }
        test { kotlin.srcDir("../src/test/kotlin") }
    }
}

tasks.test {
    useJUnitPlatform()
}
