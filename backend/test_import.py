import sys
import traceback

with open("err.txt", "w") as f:
    try:
        import main
    except Exception as e:
        f.write(traceback.format_exc())
