# PreciCast in plain language

PreciCast lets someone search for a city and see how much rain two ECMWF models predict for each of the next seven days. IFS is a physics-based forecast model; AIFS is an AI-based model. The app keeps their numbers visible side by side and flags days when their predictions differ by more than a stated rule.

It also shows two forms of context. First, it compares each day's amount with daily rainfall from the same part of the year over ten complete years of ERA5 reanalysis. That produces a “Locally Unusual” or “Severe Outlier” label when the planned thresholds are crossed. Second, it plots a range across members of each model's ensemble to show how much that model's own forecasts vary. The ensembles are separate.

The blended forecast is explicitly labelled **experimental**. Its weights came from the original design, not a rainfall accuracy study. The historical reference is reanalysis, not a station record. Model disagreement is worth inspecting, but it cannot tell us which model will be right.

The cited 2026 Zhang and Engelke study investigated record-breaking heat, cold, and wind in GraphCast, Pangu-Weather, and FuXi. It did not test AIFS or precipitation. The app's limitations panel states this directly.

If live forecast data fails, the app shows a retry message. The expired demo snapshot was removed, so an old forecast cannot appear as current. The live deployment, source, and detailed audit are linked from the [README](README.md).
