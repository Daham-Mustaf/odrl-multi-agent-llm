cd /home/yxpeng/Projects/Papers/2026/odrl-multi-agent-llm
nohup bash -lc './evaluation/evaluator/run_rwth_models.sh' > ./evaluation/evaluator/results/multi_model_runs/nohup_run_workflow.log 2>&1 < /dev/null &
echo $!
```

check logs:
tail -f ./evaluation/evaluator/results/multi_model_runs/nohup_run.log

check run status:
ps -fp <PID>

manually stop process:
kill <PID>