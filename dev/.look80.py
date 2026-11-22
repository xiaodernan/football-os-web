import io
s = io.open("services/cache-service/src/main/java/com/footballos/cache/LeagueCacheController.java", encoding="utf-8").read()
print(s[:2600])
