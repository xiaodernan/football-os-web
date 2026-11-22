import io
s = io.open("services/cache-service/src/main/java/com/footballos/cache/LeagueTablesController.java", encoding="utf-8").read()
print(s[:1500])
