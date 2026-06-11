package app

import (
	"context"
	"fmt"

	"r1rpc/internal/model"
	"r1rpc/internal/store"
)

type metricBatchKey struct {
	StatDate   string
	GroupName  string
	ActionName string
	ClientID   string
}

func accumulateMetric(target *store.DailyMetricDelta, status string, latencyMS int64) {
	var success, failed, timeoutCount int64
	switch status {
	case "success":
		success = 1
	case "timeout":
		timeoutCount = 1
	default:
		failed = 1
	}
	target.AddTotals(1, success, failed, timeoutCount, latencyMS, latencyMS)
}

func (a *App) runPersistBatch(tasks []persistTask) error {
	if len(tasks) == 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), persistTaskTimeout)
	defer cancel()

	completed := make([]*model.RPCRequest, 0, len(tasks))
	metrics := make(map[metricBatchKey]*store.DailyMetricDelta, len(tasks))

	for _, task := range tasks {
		switch task.Kind {
		case persistTaskCompleteRequest:
			var requesterUserID *int64
			if task.HasRequesterUserID {
				requesterUserID = &task.RequesterUserID
			}
			completed = append(completed, &model.RPCRequest{
				RequestID:           task.RequestID,
				GroupName:           task.GroupName,
				ActionName:          task.ActionName,
				ClientID:            task.ClientID,
				RequesterUserID:     requesterUserID,
				RequestPayloadJSON:  task.RequestPayload,
				ResponsePayloadJSON: task.ResponsePayload,
				Status:              task.Status,
				HTTPCode:            task.HTTPCode,
				LatencyMS:           task.LatencyMS,
				ErrorMessage:        task.ErrorMessage,
			})
		case persistTaskMetric:
			dateKey := task.StatTime.Format("2006-01-02")
			key := metricBatchKey{StatDate: dateKey, GroupName: task.GroupName, ActionName: task.ActionName, ClientID: task.ClientID}
			delta := metrics[key]
			if delta == nil {
				delta = &store.DailyMetricDelta{StatDate: dateKey, GroupName: task.GroupName, ActionName: task.ActionName, ClientID: task.ClientID}
				metrics[key] = delta
			}
			accumulateMetric(delta, task.Status, task.LatencyMS)
		default:
			return fmt.Errorf("unknown persist task kind: %s", task.Kind)
		}
	}

	if len(completed) > 0 {
		if err := a.Store.CompleteRPCRequests(ctx, completed); err != nil {
			return err
		}
	}
	if len(metrics) > 0 {
		items := make([]store.DailyMetricDelta, 0, len(metrics))
		for _, item := range metrics {
			items = append(items, *item)
		}
		if err := a.Store.IncrementDailyMetricsBatch(ctx, items); err != nil {
			return err
		}
	}

	return nil
}
