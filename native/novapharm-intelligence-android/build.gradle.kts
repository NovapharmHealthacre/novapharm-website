plugins {
    kotlin("jvm") version "2.2.21"
}

group = "com.novapharm.intelligence"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    // JSON is built in to Android; this dependency supplies it for JVM SDK tests.
    implementation("org.json:json:20250517")
    testImplementation(kotlin("test-junit5"))
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:1.12.2")
}

kotlin {
    jvmToolchain(17)
}

tasks.test {
    useJUnitPlatform()
}
